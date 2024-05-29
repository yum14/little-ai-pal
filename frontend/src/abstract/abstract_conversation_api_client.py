from abc import ABCMeta, abstractmethod
from model.conversation_response import ConversationResponse

class AbstractConversationApiClient(metaclass=ABCMeta):
    @abstractmethod
    def interact(self, text: str, id='') -> ConversationResponse:
        raise NotImplementedError
