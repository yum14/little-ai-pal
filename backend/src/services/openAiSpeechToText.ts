import { injectable, inject } from 'tsyringe';
import { OpenAI } from 'openai';
import * as util from 'util';
import * as os from 'os';
import * as uuid from 'uuid';
import * as path from 'path';
import * as fs from 'fs';
import { ISpeechToText } from '../interfaces/ISpeechToText';

@injectable()
class OpenAiSpeechToText implements ISpeechToText {

    constructor(@inject('OpenAI') private openai: OpenAI) {}

    public async recognize(audioBuffer: Buffer): Promise<string> {
        
        const tempDir = os.tmpdir();
        const fileName = uuid.v4();
        const tempFilePath: string = path.join(tempDir, fileName + '.wav')

        // コールバック関数だと大変なので、awaitで待てるように書き換え
        const writeFileAsync = util.promisify(fs.writeFile);

        // tempファイルに音声データを書き込み
        await writeFileAsync(tempFilePath, audioBuffer).catch((error: Error) => {
            throw new Error('Failed to write audio file. message: ' + error.message);
        });

        // 文字起こしリクエスト
        const transcription = await this.openai.audio.transcriptions.create({
            model: process.env.TRANSCRIPTIONS_GPT_MODEL,
            file: fs.createReadStream(tempFilePath),
            response_format: 'json',
            language: 'ja',
            temperature: 1,
        }).catch((error: Error) => {
            throw new Error('The request to the speech-to-text API failed. message: ' + error.message);
        });

        return transcription.text;
    }
}

export { OpenAiSpeechToText };