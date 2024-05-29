# import os
# import pyaudio
# import requests
# from abstract.abstract_text_to_speech import AbstractTextToSpeech

# class VoicevoxTextToSpeech(AbstractTextToSpeech):
#     def __init__(self) -> None:
#         self.base_url = os.getenv('VOICEVOX_BASE_URL')
#         self.speaker = os.getenv('VOICEVOX_SPEAKER')
    
#     def synthesize(self, text: str) -> None:
        
#         # クエリ作成
#         query = self.__post_audio_query(text)
        
#         # 音声合成
#         audio_data = self.__post_synthesis(query)
        
#         # 再生
#         self.__play_voice_vox_audio(audio_data)
        
#         return
    
#     def __post_audio_query(self, text) -> dict:
#         url = os.path.join(self.base_url, 'audio_query')
        
#         params = {
#             'speaker': self.speaker,
#             'text': text
#         }
        
#         try:
#             response = requests.post(url, params=params)
#             response.raise_for_status()
        
#         except Exception as err:
#             print(f'post request to voicevox query api failed: {err}')
#             raise

#         return response.json()
        
#     def __post_synthesis(self, query: dict) -> bytes:
        
#         url = os.path.join(self.base_url, 'synthesis')
        
#         params = {
#             'speaker': self.speaker
#         }
        
#         headers = {
#             'accept': 'audio/wav',
#             'content-type': 'application/json'
#         }
        
#         try:
#             response = requests.post(url, params=params, headers=headers, json=query)
#             response.raise_for_status()
            
#         except Exception as err:
#             print(f'post request to voicevox synthesis api failed: {err}')
#             raise
        
#         return response.content
        
#     def __play_voice_vox_audio(self, audio_data: bytes):

#         p = pyaudio.PyAudio()
        
#         stream = p.open(
#             format=pyaudio.paInt16,
#             channels=1,
#             rate=24000, # voicevoxは24000
#             output=True
#         )
        
#         stream.write(audio_data)
        
#         stream.stop_stream()
#         stream.close()
#         p.terminate

