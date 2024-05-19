import { injectable } from 'tsyringe';
import { ITextToSpeech } from '../interfaces/ITextToSpeech';
import { ResultReason, SpeechConfig, SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk';

@injectable()
class AzureTextToSpeech implements ITextToSpeech {
    private speechConfig: SpeechConfig;

    constructor() {
        this.speechConfig = SpeechConfig.fromSubscription(process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION);
        this.speechConfig.speechSynthesisVoiceName = "ja-JP-AoiNeural";
    }

    public async synthesize(text: string): Promise<Buffer> {

        const synthesizer = new SpeechSynthesizer(this.speechConfig);

        const result = await new Promise<Buffer>((resolve, reject) => {
            synthesizer.speakTextAsync(
                text,
                result => {
                    const { audioData } = result;

                    synthesizer.close();
                    if (result.reason === ResultReason.SynthesizingAudioCompleted) {
                        resolve(Buffer.from(audioData));
                    } else {
                        reject(new Error(`Recognition failed: ${result.errorDetails}`));
                    }
                }, error => {
                    synthesizer.close();
                    reject(new Error(`Recognition error: ${error}`));
                });
        });

        return result;
    }
}

export { AzureTextToSpeech };