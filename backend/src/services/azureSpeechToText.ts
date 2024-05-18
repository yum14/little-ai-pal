import { injectable } from 'tsyringe';
import { SpeechConfig, AudioConfig, SpeechRecognizer, AudioInputStream, SpeechRecognitionResult, ResultReason, NoMatchReason, NoMatchDetails } from 'microsoft-cognitiveservices-speech-sdk';
import { ISpeechToText } from '../interfaces/ISpeechToText';

@injectable()
class AzureSpeechToText implements ISpeechToText {

    private speechConfig: SpeechConfig;

    constructor() {
        this.speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION);
        this.speechConfig.speechRecognitionLanguage = 'ja-JP';
    }

    public async recognize(buffer: Buffer): Promise<string> {
        let pushStream = AudioInputStream.createPushStream();
        pushStream.write(buffer);
        pushStream.close();

        const audioConfig = AudioConfig.fromStreamInput(pushStream)
        const speechRecognizer = new SpeechRecognizer(this.speechConfig, audioConfig);

        const result = await new Promise<{ text: string }>((resolve, reject) => {
            speechRecognizer.recognizeOnceAsync(result => {
                speechRecognizer.close();
                if (result.reason === ResultReason.RecognizedSpeech) {
                    resolve(result);
                } else {
                    reject(new Error(`Recognition failed: ${result.errorDetails}`));
                }
            }, error => {
                speechRecognizer.close();
                reject(new Error(`Recognition error: ${error}`));
            });
        });

        return result.text;
    }
}

export { AzureSpeechToText };