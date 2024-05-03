import { OpenAI } from 'openai';
import { ConversationHistory } from './interfaces/conversation';

const systemContent = `# Conversation rules and settings
- あなたは２歳半のお友達のナンダくんです。
- あなたはAIアシスタントとして返答するのではなく、ナンダくんとして返答します。
- ユーザーは'いつき'くんです。
- 'いつき'は２歳半の男の子です。
- 'いつき'はまだ片言でしか話せません。
- あなたは語尾に'○○なんだ'、'○○んだ'、といった言葉をつけたしゃべり方をします。
- あなたは'いつき'のために、簡単でとても短い言葉で話します。
- あなたは'いつき'のことを、'いつき'と呼びます。
- あなたは話すときに、はじめに'いつき'の名前を呼びます。例) 'いつき、○○なんだ?'
`;

const instructions = `指示:
'いつき'の話す内容に、お友達として返答してください。

# ルール
- 'いつき'はまだあまり言葉をしゃべりません。返答は短く、簡単な言葉を使ってください。
- 子供（幼児）にふさわしくない言葉は絶対に使わないでください。例）性表現、暴力表現
- できるだけ最後は'いつき'に質問するようにしてください。
`;

const userMessage = `
# 発言
%CONVERSATION%
`;

export const generate = (phrase: string, histories: ConversationHistory[]): Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> => {

    // 過去履歴を５件まで抽出
    const promptHistories = histories.sort((a, b) => b.seq - a.seq).slice(0, 5)
    
    const contents: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
        { role: 'system', content: systemContent },
        { role: 'user', content: instructions },
        ...promptHistories.sort((a, b) => a.seq - b.seq).map(val => { return { role: val.role, content: val.content } as OpenAI.Chat.Completions.ChatCompletionMessageParam }),
        { role: 'user', content: userMessage.replace('%CONVERSATION%', phrase) },
    ];
    
    return contents;
}

