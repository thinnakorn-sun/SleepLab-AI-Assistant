import { ReplyContent } from '../../../shared/types';

export interface MessageHandler {
    handle(message: string, context: import('../../../shared/types').UserContext): Promise<ReplyContent>;
}
