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
sample_rate = 16000
max_seconds = 30
vad_aggressiveness = 0 # 0~3まで。大きいほどVADが敏感に認識する（ノイズが混ざりやすくはなる）

frame_duration = 30 # フレーム長。一度に処理される時間長。webrtcでは10,20,30msのみ対応
input_channels = 1 # モノラル
# chunk_size = 480 # webrtcvadでは最大480という情報が

min_fames = 20 # 解析に進む音声入力の最小フレーム数（だいたい「こんにちは」がぎりぎり入るくらいとした）

def record_audio(duration, rate=48000, format=pyaudio.paInt16, channels=1):
    
    chunk = int(rate * duration / 1000)
    p = pyaudio.PyAudio()
    stream = p.open(format=format,
                    channels=channels,
                    rate=rate,
                    input=True,
                    frames_per_buffer=chunk)
    
    vad = webrtcvad.Vad(vad_aggressiveness)
    
    frames = []
    
    start_time = time.time()
    last_voice_time = time.time()
    silence_timeout = 1
    
    print('recording...')
    
    while time.time() - start_time < max_seconds:
        data = stream.read(chunk)
        
        if vad.is_speech(data, rate):
            frames.append(data)
            last_voice_time = time.time()
        if time.time() - last_voice_time > silence_timeout:
            if len(frames) < min_fames:
                # あまりに短い単語であった場合はその後の処理に進ませないためにクリア
                frames = []
            
            break

    print('recording finished.')

    stream.close()
    p.terminate()
    
    return frames
    
def convert_to_mp3(input_file):
    sound = pydub.AudioSegment.from_wav(input_file)
    
    mp3_data = io.BytesIO()
    sound.export(mp3_data, format='mp3')
    mp3_data.seek(0)  # バッファの先頭に移動
    return mp3_data

def encordBase64(data):
    return base64.b64encode(data.read()).decode('utf-8')

def send_conversation_api(audio, id=''):
    
    url = os.path.join(CONVERSATION_BASE_URL, 'conversations')
    headers = {
        'Content-Type': 'application/json',
        'Content-Encoding': 'gzip',
        'Accept-Encoding': 'gzip'
    }
    data = {
        'id': id if id else None,
        'type': 'wav',
        'audioData': audio
    }

    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print('エラーが発生しました:', response.status_code)
    
    return response.json()

def main():

    conversation_id = ''

    while True:

        # 録音実行
        frames = record_audio(frame_duration, sample_rate, channels=input_channels)

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
    
        # メモリ上のデータをio.BytesIOにラップ
        wav_data = io.BytesIO(uncompressed_audio)

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

if __name__ == '__main__':
    main()