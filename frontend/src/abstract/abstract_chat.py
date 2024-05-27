from abc import ABCMeta, abstractmethod

class AbstractChat(metaclass=ABCMeta):
    @abstractmethod
    def first_chat(self) -> str:
        raise NotImplementedError
    
    @abstractmethod
    def chat(self, id: str) -> None:
        raise NotImplementedError
    
    