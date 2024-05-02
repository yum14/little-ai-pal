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
import { generate } from './conversation';
import * as dotenv from 'dotenv';
import { OpenAI, ClientOptions } from 'openai';

dotenv.config();

export const conversation = onRequest(
    { region: 'asia-northeast1', cors: true },
    async (request, response) => {
        const content = request.query.content as string;

        if (!content) {
            response.sendStatus(400);
        }

        const clientOptions: ClientOptions = {
            apiKey: process.env.OPENAI_API_KEY
        };
        const openai = new OpenAI(clientOptions);

        try {
            const openaiResponse = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo-16k',
                messages: generate(content)
            });

            const answer = openaiResponse.choices[0].message?.content;
            response.send(answer);
        } catch (error) {
            logger.error((error as Error).message);
            response.sendStatus(500);
        }
    }
);
