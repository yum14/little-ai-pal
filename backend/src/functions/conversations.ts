import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../DI/di';
import { Conversation, ConversationContent, ConversationsDbClient, IConversationsDbClient } from '../services/conversationsDbClient';
import * as util from 'util';
import * as zlib from 'zlib';
import { ChatCompletionsClient, IChatCompletionsClient } from '../services/chatCompletionsClient';
import { ISpeechToText } from '../interfaces/ISpeechToText';
import { AzureSpeechToText } from '../services/azureSpeechToText';
import { ConversationPrompt, IConversationPrompt, Parameter } from '../services/conversationPrompt';
import { VoicevoxTextToSpeech } from '../services/voicevoxTextToSpeech';
import { ITextToSpeech } from '../interfaces/ITextToSpeech';
import { AzureTextToSpeech } from '../services/azureTextToSpeech';

interface RequestBody {
    id: string;
    audioData: string;
    responseType: 'wav' | 'json';
}

const dbClient = container.resolve(ConversationsDbClient) as IConversationsDbClient;
const chatClient = container.resolve(ChatCompletionsClient) as IChatCompletionsClient;
const sttClient = container.resolve(AzureSpeechToText) as ISpeechToText;
const prompt = container.resolve(ConversationPrompt) as IConversationPrompt;
const synthesisApiClient = container.resolve(AzureTextToSpeech) as ITextToSpeech;

export const conversations = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {

    const body = await request.json() as RequestBody;

    // Base64デコード
    const inputAudioBuffer = Buffer.from(body.audioData, 'base64');

    // 文字起こし
    const transcription = await sttClient.recognize(inputAudioBuffer);

    // 会話履歴取得
    const data = body.id ? await dbClient.get(body.id) : undefined;
    const histories = data?.contents.map(value => value as Parameter) ?? [];

    // OpenAI AIの回答
    const messages = prompt.generate(transcription, histories);
    const answer = await chatClient.chatCompletions(messages);


    const synthesizedPromise = (async () => {
        // 音声合成
        const synthesizedSpeech = await synthesisApiClient.synthesize(answer);

        // gzip圧縮
        const gzipAsync = util.promisify(zlib.gzip);
        const comprettionBeffer = await gzipAsync(synthesizedSpeech);

        // base64エンコード
        return { buffer: synthesizedSpeech, base64Encorded: comprettionBeffer.toString('base64') };
    })();

    const dbPromise: Promise<Conversation> = (async () => {
        const maxSeq = data ? Math.max(...histories.map(value => value.seq)) : 0;
        const newContents: ConversationContent[] = [
            ...histories,
            { role: 'user', content: transcription, seq: maxSeq + 1 },
            { role: 'assistant', content: answer, seq: maxSeq + 2 }
        ];

        if (data) {
            // DB更新
            return (await dbClient.replace({ id: data.id, contents: newContents, createdOn: data.createdOn }));
        } else {
            // DB登録
            return (await dbClient.create({ contents: newContents }));
        }
    })();

    const { buffer, base64Encorded } = await synthesizedPromise;
    const conversation = await dbPromise;

    if (!body.responseType || body.responseType === 'json') {
        return { jsonBody: { id: conversation.id, answer: answer, audio: base64Encorded } };
    } else {
        return { body: buffer, headers: { "content-type": "audio/wav" } }
    }
};


app.http('conversations', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: conversations
});

