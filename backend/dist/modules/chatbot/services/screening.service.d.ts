import { ConfigService } from '@nestjs/config';
import { UserContext, ReplyContent } from '../../../shared/types';
import { ConversationService } from './conversation.service';
export declare class ScreeningService {
    private readonly conversationService;
    private readonly configService;
    constructor(conversationService: ConversationService, configService: ConfigService);
    start(context: UserContext): Promise<ReplyContent>;
    process(message: string, context: UserContext): Promise<ReplyContent>;
    private getMessages;
    private question1;
    private question2;
    private question3;
    private result;
}
