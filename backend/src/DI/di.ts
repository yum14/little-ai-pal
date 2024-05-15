import { container } from 'tsyringe';
import 'reflect-metadata';
import { ConversationsDbClient } from '../services/conversationsDbClient';
import { ConversationPrompt } from '../services/conversationPrompt';
import { ChatCompletionsClient } from '../services/chatCompletionsClient';
import OpenAI, { ClientOptions } from 'openai';
import { CosmosClient } from '@azure/cosmos';
import { VoicevoxTextToSpeech } from '../services/voicevoxTextToSpeech';
import { AzureSpeechToText } from '../services/azureSpeechToText';
import { AzureTextToSpeech } from '../services/azureTextToSpeech';

container.register('IConversationsDbClient', {
    useClass: ConversationsDbClient
});

container.register('IConversationPrompt', {
    useClass: ConversationPrompt
});

container.register('IChatCompletionsClient', {
    useClass: ChatCompletionsClient
});

container.register('OpenAI', {
    useFactory: () => {
        const option: ClientOptions = { apiKey: process.env.OPENAI_API_KEY };
        return new OpenAI(option);
    }
});

container.register('TransactionDB', {
    useFactory: () => {
        return new CosmosClient(process.env.CosmosDbConnectionString).database(process.env.TRANSACTION_DB_NAME);
    }
});

container.register('ITextToSpeech', {
    useClass: AzureTextToSpeech
});

container.register('ISpeechToText', {
    useClass: AzureSpeechToText
});


export { container };
