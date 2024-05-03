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
import * as dotenv from 'dotenv';
import { OpenAI, ClientOptions } from 'openai';

dotenv.config();

admin.initializeApp();
const db = getFirestore();

export const conversation = onRequest(
    { region: 'asia-northeast1', cors: true },
    async (request, response) => {
        try {
            const conversationId = request.query.id as string;
            const content = request.query.content as string;

            if (!content) {
                response.sendStatus(400);
            }

            // データ取得
            const data = conversationId ? await getConversation(conversationId, db) : null;
            const histories = data ? await getConversationHistories(conversationId, db) : [];

            const clientOptions: ClientOptions = {
                apiKey: process.env.OPENAI_API_KEY
            };

            // OpenAIリクエスト
            const openai = new OpenAI(clientOptions);
            const openaiResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo-16k',
                messages: generate(content, histories)
            });

            const answer = openaiResponse.choices[0].message?.content ?? '';
            const maxDbSeq = histories.length > 0 ? Math.max(...histories.map(val => val.seq)) : 0;
            const newHistories: ConversationHistory[] = [
                { role: 'user', content: content, seq: maxDbSeq + 1 },
                { role: 'assistant', content: answer, seq: maxDbSeq + 2 }
            ]

            // データ登録、ID発行
            const newId: string = data ? await updateConversation(conversationId, newHistories, db) : await createConversation(newHistories, db);

            response.send({ id: newId, content: answer });

        } catch (error) {
            logger.error(error);
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