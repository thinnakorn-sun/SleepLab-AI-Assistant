import { ConfigService } from '@nestjs/config';
import { WebhookEvent } from '@line/bot-sdk';
import { LineClient } from './line.client';
import { MessageRouter } from '../chatbot/router/message.router';
import { ConversationService } from '../chatbot/services/conversation.service';
import { OASettingsService } from '../chatbot/services/oa-settings.service';
export declare class LineService {
    private readonly lineClient;
    private readonly messageRouter;
    private readonly conversationService;
    private readonly oaSettingsService;
    private readonly configService;
    private readonly logger;
    constructor(lineClient: LineClient, messageRouter: MessageRouter, conversationService: ConversationService, oaSettingsService: OASettingsService, configService: ConfigService);
    handleEvent(event: WebhookEvent, channelId: string): Promise<void>;
}
