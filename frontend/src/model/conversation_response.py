class ConversationResponse:
    def __init__(self, id: str, message: str, finished: bool) -> None:
        self.__id = id
        self.__message = message
        self.__finished = finished
    
    @property
    def id(self):
        return self.__id
    
    @property
    def message(self):
        return self.__message
    
    @property
    def finished(self):
        return self.__finished