import os
import requests
from typing import Tuple
from azure_speech_to_text import AzureSpeechToText
from azure_text_to_speech import AzureTextToSpeech
from synthesize_type import SynthesizeType
from voicevox_text_to_speech import VoicevoxTextToSpeech

class TextChat:
    def __init__(self, synthesize_on: SynthesizeType) -> None:
        self.conversation_base_url = os.getenv('CONVERSATION_BASE_URL')
        self.function_key = os.getenv('TEXT_CHAT_API_KEY')
        self.synthesize_on = synthesize_on

    def chat(self, id='') -> Tuple[str, bytes]:
        
        print('recording....')
        
        # 録音および文字起こし
        speech_to_text = AzureSpeechToText()
        text = speech_to_text.recognize()
        
        print('recording finished...')
        
        # 会話APIリクエスト
        response_dict = self.__send_chat_api(text, id)
        conversation_id = response_dict['id']
        
        # 音声出力(azure or voicebox)
        if self.synthesize_on == SynthesizeType.Azure:
            text_to_speech = AzureTextToSpeech()
            text_to_speech.synthesize(response_dict['answer'])
            return (conversation_id, None)
        else:    
            text_to_speech = VoicevoxTextToSpeech()
            audio_data = text_to_speech.synthesize(response_dict['answer'])
            return (conversation_id, audio_data)
    
    def __send_chat_api(self, text, id=''):
        
        url = os.path.join(self.conversation_base_url, f'textChat?code={self.function_key}')
        headers = {
            'Content-Type': 'application/json'
        }
        data = {
            'id': id if id else None,
            'phrase': text
        }

        response = requests.post(url, json=data, headers=headers)
        
        if response.status_code != 200:
            print('エラーが発生しました:', response.status_code)
        
        return response.json()
