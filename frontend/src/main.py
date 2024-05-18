import pyaudio
import wave
import pydub
import io
import base64
import requests
import dotenv
import os
import gzip
import time
import webrtcvad
from gzip import GzipFile

from input_example import create_test_base64

dotenv.load_dotenv()

CONVERSATION_BASE_URL = os.getenv('CONVERSATION_BASE_URL')
CONVERSATION_API_KEY = os.getenv('CONVERSATION_API_KEY')

SILENCE_TIMEOUT = os.getenv('SILENCE_TIMEOUT') # マイク録音を終了して解析に入る判定の無音時間
SAMPLE_RATE = os.getenv('SAMPLE_RATE') # speech service(Azure)だとなぜか16000しか動かない？
CHANNELS = os.getenv('CHANNELS') # 1:モノラル、2:ステレオ
MAX_RECORDING_SECONDS = os.getenv('MAX_RECORDING_SECONDS') # 録音最大時間
MIN_PHRASE_FRAMES = os.getenv('MIN_PHRASE_FRAMES') # 解析に進む音声入力の最小フレーム数（20くらいでだいたい「こんにちは」がぎりぎり入るくらい）
VAD_AGGRESSIVENESS = os.getenv('VAD_AGGRESSIVENESS') # 0~3まで。大きいほどVADが敏感に認識する（ノイズが混ざりやすくはなる）
RESET_SESSION_SECONDS = os.getenv('RESET_SESSION_SECONDS') # 今までの会話履歴をクリアして新たなセッションとする時間

frame_duration = 30 # フレーム長。一度に処理される時間長。webrtcでは10,20,30msのみ対応
# chunk_size = 480 # webrtcvadでは最大480という情報が


def record_audio(duration, format=pyaudio.paInt16):
    rate = int(SAMPLE_RATE)
    chunk = int(rate * duration / 1000)
    p = pyaudio.PyAudio()
    stream = p.open(format=format,
                    channels=int(CHANNELS),
                    rate=rate,
                    input=True,
                    frames_per_buffer=chunk)
    
    frames = []
            
    try:

        vad = webrtcvad.Vad(int(VAD_AGGRESSIVENESS))

        start_time = time.time()
        last_voice_time = time.time()
        
        print('recording...')
        
        while time.time() - start_time < int(MAX_RECORDING_SECONDS):
            
            data = stream.read(chunk)
            
            if vad.is_speech(data, rate):
                frames.append(data)
                last_voice_time = time.time()
            if time.time() - last_voice_time > int(SILENCE_TIMEOUT):
                if len(frames) < int(MIN_PHRASE_FRAMES):
                    # あまりに短い単語であった場合はその後の処理に進ませないために空配列を返却
                    return []

        print('recording finished.')

    except Exception as e:
        print(e)
    finally:
        stream.close()
        p.terminate()
        
    return frames
    

def send_conversation_api(audio, id=''):
    
    url = os.path.join(CONVERSATION_BASE_URL, 'conversations')
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

def play_audio(audio_data: bytes):
    # メモリ上のデータをio.BytesIOにラップ
    wav_data = io.BytesIO(audio_data)

    # waveモジュールでメモリ上のデータを読み込む
    wf = wave.open(wav_data, 'rb')

    # PyAudioの設定
    p = pyaudio.PyAudio()

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

    # ストリームを閉じる
    stream.stop_stream()
    stream.close()
    p.terminate()

def main():

    conversation_id = ''
    last_conversation_time = time.time()

    while True:

        if time.time() - last_conversation_time > int(RESET_SESSION_SECONDS):
            conversation_id = ''

        try:

            # 録音実行
            frames = record_audio(frame_duration)

            if len(frames) == 0:
                continue

            # base64エンコード
            combined_frames = b''.join(frames)
            base64_data = base64.b64encode(combined_frames).decode('utf-8')
            
            # # テスト用データ
            # base64_data = create_test_base64()
            
            # HTTPリクエスト
            response_dict = send_conversation_api(base64_data, conversation_id)
            conversation_id = response_dict['id']
            
            # Base64デコード
            decoded_audio = base64.b64decode(response_dict['audioData'])
            
            # gzip展開
            uncompressed_audio = gzip.decompress(decoded_audio)
        
            # 音声再生
            play_audio(uncompressed_audio)
            
            last_conversation_time = time.time()
            
        except Exception as e:
            print(e)

if __name__ == '__main__':
    main()