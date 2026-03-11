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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreeningService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const types_1 = require("../../../shared/types");
const conversation_service_1 = require("./conversation.service");
const flex_templates_1 = require("../../line/flex-templates");
const messages_1 = require("../../../shared/constants/messages");
function isYesAnswer(message) {
    const m = message.trim();
    if (m.includes('ไม่ใช่') || m.includes('ไม่มี') || /^no$/i.test(m))
        return false;
    if (m.includes('ใช่') || m.includes('มี') || /^yes$/i.test(m))
        return true;
    return false;
}
let ScreeningService = class ScreeningService {
    constructor(conversationService, configService) {
        this.conversationService = conversationService;
        this.configService = configService;
    }
    async start(context) {
        await this.conversationService.updateContext(context.userId, {
            state: types_1.ConversationState.SCREENING_Q1,
            screeningScore: 0,
        });
        return this.question1();
    }
    async process(message, context) {
        const isYes = isYesAnswer(message);
        const score = (context.screeningScore ?? 0) + (isYes ? 1 : 0);
        switch (context.state) {
            case types_1.ConversationState.SCREENING_Q1:
                await this.conversationService.updateContext(context.userId, {
                    state: types_1.ConversationState.SCREENING_Q2,
                    screeningScore: score,
                });
                return this.question2();
            case types_1.ConversationState.SCREENING_Q2:
                await this.conversationService.updateContext(context.userId, {
                    state: types_1.ConversationState.SCREENING_Q3,
                    screeningScore: score,
                });
                return this.question3();
            case types_1.ConversationState.SCREENING_Q3:
                await this.conversationService.updateContext(context.userId, {
                    state: types_1.ConversationState.SCREENING_DONE,
                    screeningScore: score,
                });
                return this.result(score);
            default:
                return this.start(context);
        }
    }
    getMessages() {
        const botName = this.configService.get('chatbot.botName') ?? 'MOONi';
        return (0, messages_1.getScreeningMessages)(botName);
    }
    question1() {
        return this.getMessages().q1;
    }
    question2() {
        return this.getMessages().q2;
    }
    question3() {
        return this.getMessages().q3;
    }
    result(score) {
        const msgs = this.getMessages();
        const contactKey = this.configService.get('chatbot.contactMenuKey') ?? 'E';
        const articleUrl = this.configService.get('chatbot.sleepHygieneArticleUrl') ?? '';
        if (score >= 2) {
            return (0, flex_templates_1.createScreeningResultFlex)(true, msgs.highRisk, contactKey);
        }
        return (0, flex_templates_1.createScreeningResultFlex)(false, msgs.lowRisk, contactKey, {
            sleepHygieneArticleUrl: articleUrl || undefined,
        });
    }
};
exports.ScreeningService = ScreeningService;
exports.ScreeningService = ScreeningService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [conversation_service_1.ConversationService,
        config_1.ConfigService])
], ScreeningService);
//# sourceMappingURL=screening.service.js.map