import os
import azure.cognitiveservices.speech as speechsdk
from abstract.abstract_text_to_speech import AbstractTextToSpeech

class AzureTextToSpeech(AbstractTextToSpeech):
    def __init__(self) -> None:
        self.speech_key = os.getenv('AZURE_SPEECH_KEY')
        self.speech_region = os.getenv('AZURE_SPEECH_REGION')
        self.speech_voice_name = os.getenv('AZURE_SPEECH_VOICE_NAME')

    def synthesize(self, text: str) -> None:
        
        speech_config = speechsdk.SpeechConfig(subscription=self.speech_key, region=self.speech_region)
        audio_config = speechsdk.audio.AudioOutputConfig(use_default_speaker=True)
        speech_config.speech_synthesis_voice_name=self.speech_voice_name

        speech_synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)

        # 音声合成、再生
        speech_synthesis_result = speech_synthesizer.speak_text_async(text).get()

        print(speech_synthesis_result.reason)

        return

