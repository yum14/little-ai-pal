from abc import ABCMeta, abstractmethod
from typing import Tuple

class AbstractChat(metaclass=ABCMeta):
    @abstractmethod
    def first_chat(self) -> Tuple[str, bool]:
        raise NotImplementedError
    
    @abstractmethod
    def chat(self, id: str) -> Tuple[str, bool]:
        raise NotImplementedError
    
    