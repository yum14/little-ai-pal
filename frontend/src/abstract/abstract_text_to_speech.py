from abc import ABCMeta, abstractmethod

class AbstractTextToSpeech(metaclass=ABCMeta):
    @abstractmethod
    def synthesize(self, text: str) -> None:
        raise NotImplementedError
