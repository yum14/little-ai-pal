import { injectable, inject } from "tsyringe";
import { OpenAI } from 'openai';

interface IChatCompletionsClient {
    chatCompletions(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<string>
}

@injectable()
class ChatCompletionsClient implements IChatCompletionsClient {

    constructor(@inject('OpenAI') private openai: OpenAI) {}

    public async chatCompletions(messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[]): Promise<string> {
    
        const openaiResponse = await this.openai.chat.completions.create({
            model: process.env.CHAT_COMPLETIONS_GPT_MODEL,
            messages: messages
        }).catch((error: Error) => {
            throw new Error('The request to the chat completions API failed. message: ' + error.message);
        });
    
        return openaiResponse.choices[0].message?.content ?? '';
    };
}

export { IChatCompletionsClient, ChatCompletionsClient };