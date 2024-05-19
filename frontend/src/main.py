import pyaudio
import wave
import io
import dotenv
import time
import os
from voicechat import VoiceChat
from textchat import TextChat

import azure.cognitiveservices.speech as speechsdk

dev_env_path = dotenv.find_dotenv('.env.development')

if os.path.exists(dev_env_path):
    dotenv.load_dotenv(dev_env_path)
else:
    dotenv.load_dotenv()

RESET_SESSION_SECONDS = os.getenv('RESET_SESSION_SECONDS') # 今までの会話履歴をクリアして新たなセッションとする時間

def main():

    conversation_id = ''
    last_conversation_time = time.time()

    while True:

        if time.time() - last_conversation_time > int(RESET_SESSION_SECONDS):
            conversation_id = ''

        try:

            # クライアント側で文字起こし、音声合成
            textchat = TextChat()
            conversation_id = textchat.chat(conversation_id)
            
            # サーバー側で文字起こし、音声合成
            # voiceChat = VoiceChat()
            # conversation_id = voiceChat.chat(conversation_id)
                        
            last_conversation_time = time.time()
            
        except Exception as e:
            print(e)

if __name__ == '__main__':
    main()