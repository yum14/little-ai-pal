import os
import requests
from azure_speech_to_text import AzureSpeechToText
from azure_text_to_speech import AzureTextToSpeech

class TextChat:
    def __init__(self) -> None:
        self.conversation_base_url = os.getenv('CONVERSATION_BASE_URL')
        self.function_key = os.getenv('TEXT_CHAT_API_KEY')

    def chat(self, id='') -> str:
        
        # 録音および文字起こし
        speech_to_text = AzureSpeechToText()
        text = speech_to_text.recognize()
        
        # 会話APIリクエスト
        response_dict = self.__send_chat_api(text, id)
        conversation_id = response_dict['id']
        
        # 音声出力(azure or voicebox)
        text_to_speech = AzureTextToSpeech()
        text_to_speech.synthesize(response_dict['answer'])
        
        return conversation_id
    
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
