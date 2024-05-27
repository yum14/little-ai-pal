from typing import Tuple
import webrtcvad
import os
import gzip
import base64
import requests
import pyaudio
import time
import io
import wave
from injector import inject
from abstract.abstract_text_to_speech import AbstractTextToSpeech
from abstract.abstract_chat import AbstractChat
from conversation_api_client import ConversationApiClient

class VoiceChat(AbstractChat):
    @inject
    def __init__(self, text_to_speech: AbstractTextToSpeech, conversation_api_client: ConversationApiClient) -> None:
        
        self.frame_duration = 30 # フレーム長。一度に処理される時間長。webrtcでは10,20,30msのみ対応
        self.sample_rate = os.getenv('SAMPLE_RATE') # speech service(Azure)だとなぜか16000しか動かない？
        self.conversation_base_url = os.getenv('CONVERSATION_BASE_URL')
        self.conversation_api_key = os.getenv('CONVERSATION_API_KEY')
        self.silence_timeout = os.getenv('SILENCE_TIMEOUT') # マイク録音を終了して解析に入る判定の無音時間
        self.sample_rate = os.getenv('SAMPLE_RATE') # speech service(Azure)だとなぜか16000しか動かない？
        self.channels = os.getenv('CHANNELS') # 1:モノラル、2:ステレオ
        self.max_recording_seconds = os.getenv('MAX_RECORDING_SECONDS') # 録音最大時間
        self.min_phrase_frames = os.getenv('MIN_PHRASE_FRAMES') # 解析に進む音声入力の最小フレーム数（20くらいでだいたい「こんにちは」がぎりぎり入るくらい）
        self.vad_aggressiveness = os.getenv('VAD_AGGRESSIVENESS') # 0~3まで。大きいほどVADが敏感に認識する（ノイズが混ざりやすくはなる）
        self.function_key = os.getenv('VOICE_CHAT_API_KEY')
        self.first_text = os.getenv('FIRST_CHAT_TEXT')
        self.text_to_speech = text_to_speech
        self.conversation_api_client = conversation_api_client

    def first_chat(self) -> Tuple[str, bytes]:
        pass


    def chat(self, id: str) -> str:
        
        # 録音実行
        frames = self.__record_audio(self.frame_duration)

        if len(frames) == 0:
            return False

        # # base64エンコード
        combined_frames = b''.join(frames)                
        base64_data = base64.b64encode(combined_frames).decode('utf-8')
        
        # # テスト用データ
        # base64_data = create_test_base64()
        
        # HTTPリクエスト
        response_dict = self.__send_chat_api(base64_data, id)
        conversation_id = response_dict['id']
        
        # Base64デコード
        decoded_audio = base64.b64decode(response_dict['audioData'])
        
        # gzip展開
        uncompressed_audio = gzip.decompress(decoded_audio)
        
        # 音声再生
        self.__play_audio(uncompressed_audio)

        return conversation_id
    
    
    def __record_audio(self, duration, format=pyaudio.paInt16) -> list:
        rate = int(self.sample_rate)
        chunk = int(rate * duration / 1000)
        p = pyaudio.PyAudio()
        stream = p.open(format=format,
                        channels=int(self.channels),
                        rate=rate,
                        input=True,
                        frames_per_buffer=chunk)
        
        frames = []
                
        try:

            vad = webrtcvad.Vad(int(self.vad_aggressiveness))

            start_time = time.time()
            last_voice_time = time.time()
            
            print('recording...')
            
            while time.time() - start_time < int(self.max_recording_seconds):
                
                data = stream.read(chunk)
                
                if vad.is_speech(data, rate):
                    frames.append(data)
                    last_voice_time = time.time()
                if time.time() - last_voice_time > int(self.silence_timeout):
                    if len(frames) < int(self.min_phrase_frames):
                        # あまりに短い単語であった場合はその後の処理に進ませないために空配列を返却
                        return []
                    
                    break

            print('recording finished.')

        except Exception as e:
            print(e)
        finally:
            stream.close()
            p.terminate()
            
        return frames
        

    def __send_chat_api(self, audio, id=''):
        
        url = os.path.join(self.conversation_base_url, f'voiceChat?code={self.function_key}')
        headers = {
            'Content-Type': 'application/json',
            'Content-Encoding': 'gzip',
            'Accept-Encoding': 'gzip'
        }
        data = {
            'id': id if id else None,
            'type': 'json',
            'audioData': audio
        }

        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code != 200:
            print('エラーが発生しました:', response.status_code)
        
        return response.json()

    def __play_audio(self, audio_data: bytes):
        # メモリ上のデータをio.BytesIOにラップ
        wav_data = io.BytesIO(audio_data)

        # waveモジュールでメモリ上のデータを読み込む
        wf = wave.open(wav_data, 'rb')

        # PyAudioの設定
        p = pyaudio.PyAudio()

        try:
            # ストリームの設定
            stream = p.open(
                format=p.get_format_from_width(wf.getsampwidth()),
                channels=wf.getnchannels(),
                rate=wf.getframerate(),
                output=True
            )
            
            # データを少しずつ読み込みながら再生
            chunk = 1024
            data = wf.readframes(chunk)
            while data:
                stream.write(data)
                data = wf.readframes(chunk)
            
        except Exception as e:
            print(e)
            
        finally:
            # ストリームを閉じる
            stream.stop_stream()
            stream.close()
            p.terminate()
