import os
import io
import azure.cognitiveservices.speech as speechsdk

class AzureSpeechToText:
    def __init__(self) -> None:
        self.speech_key = os.getenv('AZURE_SPEECH_KEY')
        self.speech_region = os.getenv('AZURE_SPEECH_REGION')
        
    def recognize(self):
        
        speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.speech_region)
        speech_config.speech_recognition_language = "ja-JP"
        
        speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config)
        
        speech_recognition_result = speech_recognizer.recognize_once_async().get()
        
        return speech_recognition_result.text
