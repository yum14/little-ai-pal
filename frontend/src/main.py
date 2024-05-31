from injector import Injector
import pyaudio
import dotenv
import time
import os
from di_modules.textchat_module import ConversationApiClientModule, TextToSpeechConfig, TextToSpeechModule
from abstract.abstract_chat import AbstractChat
from type.synthesize_type import SynthesizeType
# from voicechat import VoiceChat
from textchat import TextChat
import pvporcupine
import struct
import numpy as np

dev_env_path = dotenv.find_dotenv('.env.development')

if os.path.exists(dev_env_path):
    dotenv.load_dotenv(dev_env_path)
else:
    dotenv.load_dotenv()

RESET_SESSION_SECONDS = os.getenv('RESET_SESSION_SECONDS') # 今までの会話履歴をクリアして新たなセッションとする時間
SYNTHESIZE_ON = os.getenv('SYNTHESIZE_ON')
PORCUPINE_ACCESS_KEY = os.getenv('PORCUPINE_ACCESS_KEY')
PORCUPINE_PPM_FILE_NAME = os.getenv('PORCUPINE_PPM_FILE_NAME')
PORCUPINE_MODEL_FILE_NAME = os.getenv('PORCUPINE_MODEL_FILE_NAME')

synthesize_type = SynthesizeType(SYNTHESIZE_ON)
injector = Injector([TextToSpeechModule(TextToSpeechConfig(synthesize_type)), ConversationApiClientModule()])

# 音声合成エンジン
synthesize_on = SynthesizeType(SYNTHESIZE_ON)

def main():

    textChat: AbstractChat = injector.get(TextChat)
    
    while True:
        try:
            
            # ウェイクワード認識
            print('waiting for wakeup word...')
            
            # 以下関数はウェイクワードが認識されるまでreturnされない
            __recognize_wake_word()
            
            print('wackup!')
            
            
            # 最初の挨拶
            conversation_id, finished = textChat.first_chat()
    
            if finished:
                continue
    
            last_conversation_time = time.time()
            
            while True:
                if time.time() - last_conversation_time > int(RESET_SESSION_SECONDS):
                    # 時間切れ
                    break
                
                # クライアント側で文字起こし、音声合成、再生
                _, finished = textChat.chat(conversation_id)
                            
                # サーバー側で文字起こし、音声合成
                # voiceChat = VoiceChat()
                # conversation_id = voiceChat.chat(conversation_id)
                
                last_conversation_time = time.time()
                
                if finished:
                    break

        except Exception as e:
            print(e)

def __recognize_wake_word() -> None:

    keyword_path = os.path.join(os.getcwd(), 'porcupine', PORCUPINE_PPM_FILE_NAME)
    model_path = os.path.join(os.getcwd(), 'porcupine', PORCUPINE_MODEL_FILE_NAME)

    porcupine = pvporcupine.create(
        access_key=PORCUPINE_ACCESS_KEY,
        keyword_paths=[keyword_path],
        model_path=model_path
    )

    p = pyaudio.PyAudio()
    
    # デフォルトのオーディオデバイスのサンプリングレート
    default_sample_rate = int(p.get_default_input_device_info()["defaultSampleRate"])

    audio_stream = p.open(
        rate=default_sample_rate,
        channels=1,
        format=pyaudio.paInt16,
        input=True,
        frames_per_buffer=int(porcupine.frame_length * (default_sample_rate / porcupine.sample_rate))
    )
    
    try:
        while True:
            
            pcm = audio_stream.read(int(porcupine.frame_length * (default_sample_rate / porcupine.sample_rate)))
            pcm = np.frombuffer(pcm, dtype=np.int16)
            pcm = pcm.astype(np.float32)

            # 16kHzにダウンサンプリング
            pcm_resampled = np.interp(
                np.linspace(0, len(pcm), porcupine.frame_length, endpoint=False),
                np.arange(len(pcm)),
                pcm
            ).astype(np.int16)
            
            # ウェイクワード認識
            keyword_index = porcupine.process(pcm_resampled.tolist())

            if keyword_index >= 0:
                # ウェイクワードが認識された場合
                return

    finally:
        audio_stream.stop_stream()
        audio_stream.close()
        p.terminate
    

if __name__ == '__main__':
    main()