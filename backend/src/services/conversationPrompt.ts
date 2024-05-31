import { injectable } from "tsyringe";
import { OpenAI } from 'openai';

interface Parameter {
    role: 'system' | 'assistant' | 'user';
    content: string;
    seq: number;
};

interface IConversationPrompt {
    generate(phrase: string, histories: Parameter[]): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
}

@injectable()
class ConversationPrompt implements IConversationPrompt {

    private systemContent = `# Conversation rules and settings
    - あなたはパルちゃんです。
    - あなたはAIアシスタントとして返答するのではなく、パルちゃんとして返答します。
    - ユーザーは'いつき'です。
    - 'いつき'は２歳半の男の子です。
    - あなたは'いつき'より少しだけ年上の女の子で、'いつき'の友達です。
    - あなたは敬語や丁寧な言葉遣いではなく、親しげな言葉遣いをします。
    - 'いつき'はまだ片言でしか言葉を話せません。あなたは'いつき'のために、簡単でとても短い言葉で話します。
    - あなたはよくセリフ中で'いつき'と名前を呼びます。
    - 子供（幼児）にふさわしくない言葉は絶対に使わないでください。例）性表現、暴力表現、乱暴な言葉遣いなど
    - あまりしつこくならないくらいに、よく'いつき'に質問するようにしてください。特に最初の挨拶と思われるセリフには必ず質問で返してください。
    - 会話履歴で判明した内容をしつこく聞かないでください。
    - 回答はこの後に音声合成を行い、音声として出力します。音声として出力できない文字（顔文字など）は回答に含めないでください。
    - 回答は「回答のフォーマット」に必ず従ってください。
    `;

    private userMessage = `
    'いつき'の最後に話した内容です。お友達としてこのセリフに返答してください。
    また、「さようなら」「ばいばい」などの別れのセリフで会話を終了します。
    別れの返答を行い、終了判定とします。

    # 発言
    %CONVERSATION%
    `;

    private responseFormat = `# 回答のフォーマット
    \`\`\`json
    { "message": "", "finished":  }
    \`\`\`

    - message: 発言に対する回答
    - finished: 終了判定結果。会話の終了を認識した場合true、そうではない場合はfalse
    `;


    public generate(phrase: string, histories: Parameter[]): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> {

        // 過去履歴を５件まで抽出
        const promptHistories = histories.sort((a, b) => b.seq - a.seq).slice(0, 5)
        const conversationHistories: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam>
            = [...promptHistories.sort((a, b) => a.seq - b.seq).map(val => ({ role: val.role, content: val.content }))];

        const contents: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [];
        contents.push({ role: 'system', content: this.systemContent });

        if (conversationHistories.length > 0) {
            contents.push({ role: 'system', content: '以下が今までの会話履歴です。'});
            contents.push(...conversationHistories);
        }
        contents.push({ role: 'user', content: this.userMessage.replace('%CONVERSATION%', phrase) });
        contents.push({ role: 'system', content: this.responseFormat });

        return contents;
    }
}

export { ConversationPrompt, IConversationPrompt, Parameter };