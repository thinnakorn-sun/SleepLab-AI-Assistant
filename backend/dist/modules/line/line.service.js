"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var LineService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LineService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const line_client_1 = require("./line.client");
const message_router_1 = require("../chatbot/router/message.router");
const conversation_service_1 = require("../chatbot/services/conversation.service");
const oa_settings_service_1 = require("../chatbot/services/oa-settings.service");
const flex_templates_1 = require("./flex-templates");
let LineService = LineService_1 = class LineService {
    constructor(lineClient, messageRouter, conversationService, oaSettingsService, configService) {
        this.lineClient = lineClient;
        this.messageRouter = messageRouter;
        this.conversationService = conversationService;
        this.oaSettingsService = oaSettingsService;
        this.configService = configService;
        this.logger = new common_1.Logger(LineService_1.name);
    }
    async handleEvent(event, channelId) {
        if (event.type === 'follow') {
            const userId = event.source?.userId;
            const replyToken = event.replyToken;
            if (!userId || !replyToken)
                return;
            const devMode = this.configService.get('line.devMode');
            const testUserIds = this.configService.get('line.testLineUserIds') ?? [];
            if (devMode && testUserIds.length > 0 && !testUserIds.includes(userId)) {
                this.logger.log(`[LINE] Follow: DEV_MODE ข้าม (whitelist) → ${userId}`);
                return;
            }
            const centerName = await this.oaSettingsService.getCenterName(channelId);
            const botName = this.configService.get('chatbot.botName');
            const greeting = (0, flex_templates_1.createGreetingFlex)(centerName, { botName });
            await this.lineClient.replyMessage(replyToken, greeting);
            this.logger.log(`[LINE] Follow: ส่ง Greeting ✓`);
            return;
        }
        if (event.type !== 'message' || event.message?.type !== 'text') {
            this.logger.debug(`[LINE] Skip event: type=${event.type}, msgType=${event.message?.type ?? 'N/A'}`);
            return;
        }
        const { replyToken } = event;
        const { text } = event.message;
        const userId = event.source.userId;
        if (!userId) {
            this.logger.warn(`[LINE] No userId in event`);
            return;
        }
        const devMode = this.configService.get('line.devMode');
        const testUserIds = this.configService.get('line.testLineUserIds') ?? [];
        if (devMode && !testUserIds.includes(userId)) {
            this.logger.log(`[LINE] DEV_MODE: ข้ามผู้ใช้นี้ (เพิ่มใน TEST_LINE_USER_IDS เพื่อให้บอทตอบ) → ${userId}`);
            return;
        }
        this.logger.log(`[LINE] Processing | lineUserId=${userId} | channelId=${channelId} | text="${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        const context = await this.conversationService.getContext(userId, channelId);
        this.logger.log(`[LINE] Context | state=${context.state} | screeningScore=${context.screeningScore ?? 0}`);
        await this.conversationService.saveMessage(context.userId, text, 'user');
        const response = await this.messageRouter.route(text, context);
        const textToSave = typeof response === 'string'
            ? response
            : response.flex.altText;
        this.logger.log(`[LINE] Response: ${typeof response === 'string' ? 'text' : 'flex'} | ${textToSave?.length ?? 0} chars`);
        await this.conversationService.saveMessage(context.userId, textToSave, 'assistant');
        await this.lineClient.replyMessage(replyToken, response);
        this.logger.log(`[LINE] Reply sent ✓`);
    }
};
exports.LineService = LineService;
exports.LineService = LineService = LineService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [line_client_1.LineClient,
        message_router_1.MessageRouter,
        conversation_service_1.ConversationService,
        oa_settings_service_1.OASettingsService,
        config_1.ConfigService])
], LineService);
//# sourceMappingURL=line.service.js.map