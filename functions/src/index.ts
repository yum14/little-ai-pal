/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

import * as dotenv from "dotenv";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

export const helloWorld = onRequest(
    { region: "asia-northeast1", cors: true },
    (request, response) => {
        logger.info("Hello logs!", { structuredData: true });
        response.send("Hello from Firebase!");
    });

import { OpenAI, ClientOptions } from "openai";

dotenv.config();

export const conversation = onRequest(
  { region: "asia-northeast1", cors: true },
  async (request, response) => {

    const clientOptions: ClientOptions = {
      apiKey: process.env.OPENAI_API_KEY
    };

    const openai = new OpenAI(clientOptions);

    const openaiResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-16k",
      messages: [{ role: "user", content: "こんにちは" }]
    });

    const answer = openaiResponse.choices[0].message?.content;
    logger.debug(answer);
    response.send(answer);
  }  
);
