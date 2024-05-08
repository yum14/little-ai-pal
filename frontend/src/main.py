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

dotenv.load_dotenv()

CONVERSATION_BASE_URL = os.getenv("CONVERSATION_BASE_URL")
CONVERSATION_API_KEY = os.getenv("CONVERSATION_API_KEY")

id = ''

def record_audio(filename, duration, sample_rate=44100, chunk_size=1024, format=pyaudio.paInt16, channels=1):
    p = pyaudio.PyAudio()
    stream = p.open(format=format,
                    channels=channels,
                    rate=sample_rate,
                    input=True,
                    frames_per_buffer=chunk_size)
    frames = []
    print("Recording...")
    for _ in range(0, int(sample_rate / chunk_size * duration)):
        data = stream.read(chunk_size)
        frames.append(data)
    print("Finished recording.")
    stream.stop_stream()
    stream.close()
    p.terminate()

    wf = wave.open(filename, 'wb')
    wf.setnchannels(channels)
    wf.setsampwidth(p.get_sample_size(format))
    wf.setframerate(sample_rate)
    wf.writeframes(b''.join(frames))
    wf.close()

def convert_to_mp3(input_file):
    sound = pydub.AudioSegment.from_wav(input_file)
    
    mp3_data = io.BytesIO()
    sound.export(mp3_data, format="mp3")
    mp3_data.seek(0)  # バッファの先頭に移動
    return mp3_data

def encordBase64(data):
    return base64.b64encode(data.read()).decode('utf-8')

def send(audio):
    
    url = os.path.join(CONVERSATION_BASE_URL, "conversation")
    headers = {"Content-Type": "application/json"}
    data = {
        "id": id,
        "audioData": audio
    }

    response = requests.post(url, json=data, headers=headers)
    
    if response.status_code != 200:
        print("エラーが発生しました:", response.status_code)
    
    return response.json()

def main():
    # 録音設定
    filename = "recorded_audio.wav"
    duration = 5  # 録音する秒数
    sample_rate = 44100
    chunk_size = 1024

    # 録音実行
    record_audio(filename, duration, sample_rate, chunk_size)

    # WAVをMP3に変換
    mp3_data = convert_to_mp3(filename)
    
    # base64エンコード
    base64_data = encordBase64(mp3_data)
    
    # HTTPリクエスト
    response_dict = send(base64_data)

    id = response_dict["id"]

    # Base64デコード
    decoded_audio = base64.b64decode(response_dict["content"])
    
    # gzip展開
    uncompressed_audio = gzip.decompress(decoded_audio)
    
    
    chunk = 1024
    delay = 0 # はじめに少しディレイさせt開始させる
    end_early = 0.5 # 最後をはやめに切り上げる
    
    # wavデータの読み込み
    wf = wave.open(io.BytesIO(uncompressed_audio), 'rb')
    
    # ストリームを開く
    # voicevoxのサンプリングレートは24000
    pya = pyaudio.PyAudio()
    stream = pya.open(format=pya.get_format_from_width(wf.getsampwidth()),
                      channels=wf.getnchannels(),
                      rate=wf.getframerate(),
                      output=True)
    
    
    data = wf.readframes(chunk)
    time.sleep(delay)
    while data:
        stream.write(data)
        data = wf.readframes(chunk)
        
    # ストリームを終了
    time.sleep(end_early)
    stream.stop_stream()
    stream.close()
    
    # PyAudioを終了
    pya.terminate()

if __name__ == "__main__":
    main()