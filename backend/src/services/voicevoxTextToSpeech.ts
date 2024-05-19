import axios from 'axios';
import { inject, injectable } from 'tsyringe';
import { ITextToSpeech } from '../interfaces/ITextToSpeech';

@injectable()
class VoicevoxTextToSpeech implements ITextToSpeech {

    private baseUrl = process.env.VOICEVOX_BASE_URL;

    public async synthesize(text: string): Promise<Buffer> {

        const baseUrl = process.env.VOICEVOX_BASE_URL;

        // クエリ生成
        const query = await axios.post(`${this.baseUrl}/audio_query?speaker=1&text=${encodeURIComponent(text)}`).catch(error => {
            throw new Error('The request to the audio_query API failed. message: ' + error.message)
        });

        // 音声合成
        const audio = await axios.post(`${this.baseUrl}/synthesis?speaker=1`, JSON.stringify(query.data), {
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
}

export { VoicevoxTextToSpeech };