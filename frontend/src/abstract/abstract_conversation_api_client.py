from abc import ABCMeta, abstractmethod
from typing import Tuple

class AbstractConversationApiClient(metaclass=ABCMeta):
    @abstractmethod
    def interact(self, text: str, id='') -> Tuple[str, str]:
        raise NotImplementedError
