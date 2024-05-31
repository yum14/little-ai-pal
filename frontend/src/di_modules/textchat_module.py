from injector import Module, provider
from azure_text_to_speech import AzureTextToSpeech
from abstract.abstract_conversation_api_client import AbstractConversationApiClient
from conversation_api_client import ConversationApiClient
# from voicevox_text_to_speech import VoicevoxTextToSpeech
from type.synthesize_type import SynthesizeType
from abstract.abstract_text_to_speech import AbstractTextToSpeech

class TextToSpeechConfig:
    def __init__(self, synthesize_type: SynthesizeType) -> None:
        self.synthesize_type = synthesize_type

class TextToSpeechModule(Module):
    def __init__(self,  text_to_speech_config: TextToSpeechConfig) -> None:
        self.text_to_speech_config = text_to_speech_config

    @provider
    def provide(self) -> AbstractTextToSpeech:
        # if self.text_to_speech_config.synthesize_type == SynthesizeType.Voicevox:
        #     return VoicevoxTextToSpeech()
        # else:
        #     return AzureTextToSpeech()
        return AzureTextToSpeech()

class ConversationApiClientModule(Module):
    @provider
    def provide(self) -> AbstractConversationApiClient:
        return ConversationApiClient()