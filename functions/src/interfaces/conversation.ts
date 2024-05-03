export interface ConversationHistory {
    role: string;
    content: string;
    seq: number;
};

export interface Conversation {
    createdOn?: Date;
    modifiedOn?: Date;
}
