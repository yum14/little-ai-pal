import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import 'reflect-metadata';
import { container } from '../DI/di';
import { ConversationContent, ConversationsDbClient, IConversationsDbClient } from '../services/conversationsDbClient';
import * as util from 'util';
import * as zlib from 'zlib';
import { ChatCompletionsClient, IChatCompletionsClient } from '../services/chatCompletionsClient';
import { ISpeechToText } from '../interfaces/ISpeechToText';
import { AzureSpeechToText } from '../services/azureSpeechToText';
import { ConversationPrompt, IConversationPrompt, Parameter } from '../services/conversationPrompt';
import { VoicevoxTextToSpeech } from '../services/voicevoxTextToSpeech';
import { ITextToSpeech } from '../interfaces/ITextToSpeech';
import { AzureTextToSpeech } from '../services/azureTextToSpeech';

interface VoiceChatRequestBody {
    id: string;
    audioData: string;
    responseType: 'wav' | 'json';
}

interface TextChatRequestBody {
    id: string;
    phrase: string;
}

interface ConversationChatResponse {
    message: string;
    finished: boolean;
}

const dbClient = container.resolve(ConversationsDbClient) as IConversationsDbClient;
const chatClient = container.resolve(ChatCompletionsClient) as IChatCompletionsClient;
const sttClient = container.resolve(AzureSpeechToText) as ISpeechToText;
const prompt = container.resolve(ConversationPrompt) as IConversationPrompt;
const synthesisApiClient = container.resolve(AzureTextToSpeech) as ITextToSpeech;

// export const voiceChat = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {

//     const body = await request.json() as VoiceChatRequestBody;

//     // Base64デコード
//     const decodedBuffer = Buffer.from(body.audioData, 'base64');

//     // 文字起こし
//     const transcription = await sttClient.recognize(decodedBuffer);

//     // 会話履歴取得
//     const data = body.id ? await dbClient.get(body.id) : undefined;
//     const histories = data?.contents.map(value => value as Parameter) ?? [];

//     // OpenAI AIの回答
//     const messages = prompt.generate(transcription, histories);
//     const answer = await chatClient.chatCompletions(messages);

//     // 音声合成
//     const synthesizedSpeech = await synthesisApiClient.synthesize(answer);

//     // gzip圧縮
//     const gzipAsync = util.promisify(zlib.gzip);
//     const comprettionBeffer = await gzipAsync(synthesizedSpeech);

//     // base64エンコード
//     const EncordedAnser = comprettionBeffer.toString('base64');

//     const conversation = await (async () => {
//         const maxSeq = data ? Math.max(...histories.map(value => value.seq)) : 0;
//         const newContents: ConversationContent[] = [
//             ...histories,
//             { role: 'user', content: transcription, seq: maxSeq + 1 },
//             { role: 'assistant', content: answer, seq: maxSeq + 2 }
//         ];

//         if (data) {
//             // DB更新
//             return (await dbClient.replace({ id: data.id, contents: newContents, createdOn: data.createdOn }));
//         } else {
//             // DB登録
//             return (await dbClient.create({ contents: newContents }));
//         }
//     })();

//     if (!body.responseType || body.responseType === 'json') {
//         return { jsonBody: { id: conversation.id, answer: answer, audioData: EncordedAnser } };
//     } else {
//         return { body: comprettionBeffer, headers: { "Content-Type": "audio/wav" } }
//     }
// };


export const textChat = async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {

    const body = await request.json() as TextChatRequestBody;

    // 会話履歴取得
    const data = body.id ? await dbClient.get(body.id) : undefined;
    const histories = data?.contents.map(value => value as Parameter) ?? [];

    // OpenAI AIの回答
    const messages = prompt.generate( body.phrase, histories);
    const response = await chatClient.chatCompletions(messages);

    const conversationResponse = JSON.parse(response) as ConversationChatResponse

    // たまにシングルクォートが入ることがあるので補正
    conversationResponse.message = conversationResponse.message.replace('\'', '');

    const conversation = await (async () => {
        const maxSeq = data ? Math.max(...histories.map(value => value.seq)) : 0;
        const newContents: ConversationContent[] = [
            ...histories,
            { role: 'user', content: body.phrase, seq: maxSeq + 1 },
            { role: 'assistant', content: conversationResponse.message, seq: maxSeq + 2 }
        ];

        if (data) {
            // DB更新
            return (await dbClient.replace({ id: data.id, contents: newContents, createdOn: data.createdOn }));
        } else {
            // DB登録
            return (await dbClient.create({ contents: newContents }));
        }
    })();

    return { jsonBody: { id: conversation.id, message: conversationResponse.message, finished: conversationResponse.finished } }
}

// app.http('voiceChat', {
//     methods: ['POST'],
//     authLevel: 'function',
//     handler: voiceChat,
//     route: "conversations/voiceChat"
// });

app.http('textChat', {
    methods: ['POST'],
    authLevel: 'function',
    handler: textChat,
    route: "conversations/textChat"
});
