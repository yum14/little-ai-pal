export interface ITextToSpeech {
    synthesize(text: string): Promise<Buffer>;
}