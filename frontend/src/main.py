import pyaudio
import dotenv
import time
import os
from synthesize_type import SynthesizeType
from voicechat import VoiceChat
from textchat import TextChat

import azure.cognitiveservices.speech as speechsdk

dev_env_path = dotenv.find_dotenv('.env.development')

if os.path.exists(dev_env_path):
    dotenv.load_dotenv(dev_env_path)
else:
    dotenv.load_dotenv()

RESET_SESSION_SECONDS = os.getenv('RESET_SESSION_SECONDS') # 今までの会話履歴をクリアして新たなセッションとする時間
SYNTHESIZE_ON = os.getenv('SYNTHESIZE_ON')

def main():

    conversation_id = ''
    last_conversation_time = time.time()

    while True:

        if time.time() - last_conversation_time > int(RESET_SESSION_SECONDS):
            conversation_id = ''

        try:
            
            # 音声合成エンジン
            synthesize_on = SynthesizeType(SYNTHESIZE_ON)
            
            # クライアント側で文字起こし、音声合成
            textchat = TextChat(synthesize_on)
            conversation_id, audio_data = textchat.chat(conversation_id)
            
            # 音声再生(Azureの場合は音声合成と同時に再生されるためここでは不要)
            if synthesize_on == SynthesizeType.Voicevox:
                __play_voice_vox_audio(audio_data)
                        
            # サーバー側で文字起こし、音声合成
            # voiceChat = VoiceChat()
            # conversation_id = voiceChat.chat(conversation_id)
            
            last_conversation_time = time.time()
            
        except Exception as e:
            print(e)

def __play_voice_vox_audio(audio_data: bytes):

    p = pyaudio.PyAudio()
    
    stream = p.open(
        format=pyaudio.paInt16,
        channels=1,
        rate=24000, # voicevoxは24000
        output=True
    )
    
    stream.write(audio_data)
    
    stream.stop_stream()
    stream.close()
    p.terminate


if __name__ == '__main__':
    main()