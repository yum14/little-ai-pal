export interface ISpeechToText {
    recognize(audioBuffer: Buffer): Promise<string>;
}
