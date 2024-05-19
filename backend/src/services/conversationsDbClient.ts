import { inject, injectable } from "tsyringe";
import { Container, Database, PatchRequestBody } from '@azure/cosmos';

interface IConversationsDbClient {
    get(id: string): Promise<Conversation | undefined>;
    create(content: Conversation): Promise<Conversation>;
    replace(content: Conversation): Promise<Conversation>;
}

interface Conversation {
    id?: string;
    contents: ConversationContent[];
    createdOn?: Date;
    modifiedOn?: Date;
}

interface ConversationContent {
    role: 'system' | 'assistant' | 'user';
    content: string;
    seq: number;
}

@injectable()
class ConversationsDbClient implements IConversationsDbClient {

    private container: Container;

    constructor(@inject('TransactionDB') database: Database) {
        this.container = database.container('Conversations');
    }

    public async get(id: string): Promise<Conversation | undefined> {
        const { statusCode, item, resource, activityId, etag } = await this.container.item(id).read();
        return resource as Conversation | undefined;
    }

    public async create(content: Conversation): Promise<Conversation> {
        const now = new Date();

        const newValue: Conversation = {
            contents: content.contents,
            createdOn: content.createdOn || now,
            modifiedOn: content.modifiedOn || now,
        };

        const { statusCode, item, resource, activityId, etag } = await this.container.items.create(newValue);
        return resource as Conversation;
    }

    public async replace(content: Conversation): Promise<Conversation> {

        const replaceValue: Conversation = {
            id: content.id,
            contents: content.contents,
            createdOn: content.createdOn,
            modifiedOn: content.modifiedOn || new Date(),
        };

        const { statusCode, item, resource, activityId, etag } = await this.container.item(content.id).replace(replaceValue);
        return resource as Conversation;
    }
}

export { ConversationsDbClient, Conversation, ConversationContent, IConversationsDbClient };