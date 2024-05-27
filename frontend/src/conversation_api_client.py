import os
import requests
from typing import Tuple
from abstract.abstract_conversation_api_client import AbstractConversationApiClient

class ConversationApiClient(AbstractConversationApiClient):
    def __init__(self) -> None:
        self.conversation_base_url = os.getenv('CONVERSATION_BASE_URL')
        self.function_key = os.getenv('TEXT_CHAT_API_KEY')
    
    def interact(self, text: str, id='') -> Tuple[str, str]:
            # 会話APIリクエスト
        response_dict = self.__send_chat_api(text, id)
        return (response_dict['id'], response_dict['answer'])

    def __send_chat_api(self, text, id='') -> dict:
        
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