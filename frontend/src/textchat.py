import os
from injector import inject
from azure_speech_to_text import AzureSpeechToText
from abstract.abstract_text_to_speech import AbstractTextToSpeech
from abstract.abstract_chat import AbstractChat
from conversation_api_client import ConversationApiClient

class TextChat(AbstractChat):
    @inject
    def __init__(self, text_to_speech: AbstractTextToSpeech, conversation_api_client: ConversationApiClient) -> None:
        self.conversation_base_url = os.getenv('CONVERSATION_BASE_URL')
        self.function_key = os.getenv('TEXT_CHAT_API_KEY')
        self.first_text = os.getenv('FIRST_CHAT_TEXT')
        self.text_to_speech = text_to_speech
        self.conversation_api_client = conversation_api_client
        
    def first_chat(self) -> str:
        # 会話APIリクエスト
        conversation_id, answer = self.conversation_api_client.interact(self.first_text)
        
        # 音声合成、再生
        audio_data = self.text_to_speech.synthesize(answer)
        
        return conversation_id
    
    def chat(self, id: str) -> None:
        
        print('recording....')
        
        # 録音および文字起こし
        speech_to_text = AzureSpeechToText()
        text = speech_to_text.recognize()
        
        print('recording finished...')
        
        # 会話APIリクエスト
        _, answer = self.conversation_api_client.interact(text, id)
        
        # 音声出力
        audio_data = self.text_to_speech.synthesize(answer)
        
        return
    