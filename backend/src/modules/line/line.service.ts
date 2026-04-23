import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookEvent, TextEventMessage } from '@line/bot-sdk';
import { LineClient } from './line.client';
import { MessageRouter } from '../chatbot/router/message.router';
import { ConversationService } from '../chatbot/services/conversation.service';
import { OASettingsService } from '../chatbot/services/oa-settings.service';
import { createGreetingFlex } from './flex-templates';
import { resolveGreetingHeaderLine } from '../../shared/oa-center';

@Injectable()
export class LineService {
    private readonly logger = new Logger(LineService.name);

    constructor(
        private readonly lineClient: LineClient,
        private readonly messageRouter: MessageRouter,
        private readonly conversationService: ConversationService,
        private readonly oaSettingsService: OASettingsService,
        private readonly configService: ConfigService,
    ) { }

    async handleEvent(event: WebhookEvent, channelId: string): Promise<void> {
        // ── Follow: เมื่อลูกค้าแอดไลน์ หรือกดเริ่มใช้งานครั้งแรก ───
        if (event.type === 'follow') {
            const userId = (event as any).source?.userId;
            const replyToken = (event as any).replyToken;
            if (!userId || !replyToken) return;
            const testUserIds = this.configService.get<string[]>('line.testLineUserIds') ?? [];
            if (testUserIds.length > 0 && !testUserIds.includes(userId)) {
                this.logger.log(`[LINE] Follow: ข้าม (whitelist) → ${userId}`);
                return;
            }
            const centerName = await this.oaSettingsService.getCenterName(channelId);
            const botName = this.configService.get<string>('chatbot.botName');
            const headerLine = resolveGreetingHeaderLine(channelId) ?? undefined;
            const greeting = createGreetingFlex(centerName, { botName, headerLine });
            await this.lineClient.replyMessage(replyToken, greeting, channelId);
            this.logger.log(`[LINE] Follow: ส่ง Greeting ✓`);
            return;
        }

        const isTextMessage = event.type === 'message' && (event as any).message?.type === 'text';
        const isPostback = event.type === 'postback';
        if (!isTextMessage && !isPostback) {
            this.logger.debug(`[LINE] Skip event: type=${event.type}, msgType=${(event as any).message?.type ?? 'N/A'}`);
            return;
        }

        const { replyToken } = event;
        const userId = event.source.userId;
        const routeInput = isPostback
            ? ((event as any).postback?.data as string | undefined)?.trim() ?? ''
            : (event.message as TextEventMessage).text;
        const userMessageForLog = isPostback ? `postback:${routeInput}` : routeInput;

        if (!userId) {
            this.logger.warn(`[LINE] No userId in event`);
            return;
        }

        // Whitelist: ถ้า TEST_LINE_USER_IDS มีค่า → ตอบแค่ user ใน list นั้น (ไม่กระทบผู้ใช้จริง)
        const testUserIds = this.configService.get<string[]>('line.testLineUserIds') ?? [];
        if (testUserIds.length > 0 && !testUserIds.includes(userId)) {
            this.logger.log(`[LINE] Whitelist: ข้ามผู้ใช้นี้ (เพิ่มใน TEST_LINE_USER_IDS เพื่อให้บอทตอบ) → ${userId}`);
            return;
        }

        this.logger.log(
            `[LINE] Processing | lineUserId=${userId} | channelId=${channelId} | ${isPostback ? 'postback' : 'text'}="${userMessageForLog.substring(0, 50)}${userMessageForLog.length > 50 ? '...' : ''}"`,
        );

        // 1. Get Conversation State
        const context = await this.conversationService.getContext(userId, channelId);
        this.logger.log(`[LINE] Context | state=${context.state} | screeningScore=${context.screeningScore ?? 0}`);

        // 2. Save user message
        await this.conversationService.saveMessage(context.userId, userMessageForLog, 'user');

        // 3. Route to handler
        const response = await this.messageRouter.route(routeInput, context);
        if (response == null) {
            // เมนู/ข้อความบางประเภทอาจเป็น "action จากปุ่ม" ที่เราไม่ต้องการให้บอทตอบกลับ
            this.logger.log(`[LINE] No reply (router skipped) | lineUserId=${userId}`);
            return;
        }
        const textToSave = typeof response === 'string'
            ? response
            : (response as { flex: { altText: string } }).flex.altText;
        this.logger.log(`[LINE] Response: ${typeof response === 'string' ? 'text' : 'flex'} | ${textToSave?.length ?? 0} chars`);

        // 4. Save assistant response
        await this.conversationService.saveMessage(context.userId, textToSave, 'assistant');

        // 5. Reply to LINE
        await this.lineClient.replyMessage(replyToken, response, channelId);
        this.logger.log(`[LINE] Reply sent ✓`);
    }
}
