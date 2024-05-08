/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from 'firebase-functions/v2/https';
 * import {onDocumentWritten} from 'firebase-functions/v2/firestore';
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// export const helloWorld = onRequest(
//     { region: 'asia-northeast1', cors: true },
//     (request, response) => {
//         logger.info('Hello logs!', { structuredData: true });
//         response.send('Hello from Firebase!');
//     });

import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { Conversation, ConversationHistory } from './interfaces/conversation'
import { generate } from './conversation';
import { converter } from './converter';
import { OpenAI, ClientOptions } from 'openai';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as uuid from 'uuid';
import axios from 'axios';
import * as zlib from 'zlib';

interface RequestData {
    id: string;
    audioData: string;
}

admin.initializeApp();
const db = getFirestore();

export const conversation = onRequest(
    { region: 'asia-northeast1', cors: true },
    async (request, response) => {
        try {

            switch (request.method) {
                case 'POST':
                    break;
                default:
                    response.sendStatus(405);
                    break;
            }

            const req: RequestData = request.body;

            if (!req.audioData) {
                response.sendStatus(400);
            }

            const option: ClientOptions = {
                apiKey: process.env.OPENAI_API_KEY
            };

            const openai = new OpenAI(option);

            // Base64デコード
            const inputAudioBinary = Buffer.from(req.audioData, 'base64');

            // OpenAI 文字起こし
            const transcriptions = await createTranscriptions(openai, inputAudioBinary);

            // データ取得
            const data = req.id ? await getConversation(req.id, db) : null;
            const histories = data ? await getConversationHistories(req.id, db) : [];

            // OpenAI チャット
            const openaiResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo-16k',
                messages: generate(transcriptions, histories)
            });
            const answer = openaiResponse.choices[0].message?.content ?? '';

            // 音声合成
            const audioBuffer: Buffer = await createAudio(answer);

            // // gzip圧縮
            const gzipAsync = util.promisify(zlib.gzip);
            const comprettionBeffer = await gzipAsync(audioBuffer);
            
            // base64エンコード
            const encodedWav = comprettionBeffer.toString('base64');

            // データ登録、ID発行
            const maxDbSeq = histories.length > 0 ? Math.max(...histories.map(val => val.seq)) : 0;
            const newHistories: ConversationHistory[] = [
                { role: 'user', content: transcriptions, seq: maxDbSeq + 1 },
                { role: 'assistant', content: answer, seq: maxDbSeq + 2 }
            ];
            const newId: string = data ? await updateConversation(req.id, newHistories, db) : await createConversation(newHistories, db);

            response.set('content-type', 'application/json')
            response.send({ id: newId, content: encodedWav });


        } catch (error) {
            logger.error(error);
            response.status(500).send((error as Error).message);
            return;
        }
    }
);

const getConversation = async (id: string, db: FirebaseFirestore.Firestore): Promise<Conversation | null> => {

    const document = await db.collection('conversations')
        .doc(id)
        .withConverter(converter<Conversation>())
        .get();

    if (!document.exists) {
        return null;
    }

    return document.data() ?? null;
}

const getConversationHistories = async (id: string, db: FirebaseFirestore.Firestore): Promise<ConversationHistory[]> => {

    const documents = await db.collection('conversations')
        .doc(id)
        .collection('histories')
        .withConverter(converter<ConversationHistory>())
        .get();

    if (documents.empty) {
        return [];
    }

    let result: ConversationHistory[] = [];
    documents.forEach(doc => {
        result.push(doc.data())
    });

    return result;
}

const updateConversation = async (id: string, histories: ConversationHistory[], db: FirebaseFirestore.Firestore): Promise<string> => {

    histories.forEach(async history => {
        await db.collection('conversations')
            .doc(id)
            .collection('histories')
            .withConverter(converter<ConversationHistory>())
            .add(history);
    });

    await db.collection('conversations')
        .doc(id)
        .withConverter(converter<Conversation>())
        .set({ modifiedOn: new Date() });

    return id;
}

const createConversation = async (histories: ConversationHistory[], db: FirebaseFirestore.Firestore): Promise<string> => {

    const now = new Date();
    const res = await db.collection('conversations')
        .withConverter(converter<Conversation>())
        .add({ createdOn: now, modifiedOn: now });

    histories.forEach(async history => {
        await db.collection('conversations')
            .doc(res.id)
            .collection('histories')
            .withConverter(converter<ConversationHistory>())
            .add(history);
    });

    return res.id;
}

const createTranscriptions = async (client: OpenAI, audioData: Buffer): Promise<string> => {

    const tempDir = os.tmpdir();
    const fileName = uuid.v4();
    const tempFilePath: string = path.join(tempDir, fileName + ".mp3")

    // コールバック関数だと大変なので、awaitで待てるように書き換え
    const writeFileAsync = util.promisify(fs.writeFile);

    // ローカルの/tmp以下のファイルに音声データを書き込み
    // ※tempのファイルはfunctions終了時に削除される
    await writeFileAsync(tempFilePath, audioData).catch((error: Error) => {
        throw new Error('Failed to write audio file. message: ' + error.message);
    });

    // 文字起こしリクエスト
    const transcription = await client.audio.transcriptions.create({
        model: "whisper-1",
        file: fs.createReadStream(tempFilePath),
        response_format: "json",
        language: "ja",
        temperature: 1,
    }).catch((error: Error) => {
        throw new Error('The request to the speech-to-text API failed. message: ' + error.message);
    });

    return transcription.text;
}

const createAudio = async (text: string): Promise<Buffer> => {

    const baseUrl = process.env.VOICEVOX_BASE_URL;

    // クエリ生成
    const query = await axios.post(`${baseUrl}/audio_query?speaker=1&text=${encodeURIComponent(text)}`).catch(error => {
        throw new Error('The request to the audio_query API failed. message: ' + error.message)
    });

    // 音声合成
    const audio = await axios.post(`${baseUrl}/synthesis?speaker=1`, JSON.stringify(query.data), {
        responseType: 'arraybuffer',
        headers: {
            'accept': 'audio/wav',
            'content-type': 'application/json'
        }
    }).catch(error => {
        throw new Error('The request to the synthesis API failed. message: ' + error.message)
    });

    return Buffer.from(audio.data, 'binary');
}