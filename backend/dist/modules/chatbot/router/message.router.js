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
var MessageRouter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageRouter = void 0;
const common_1 = require("@nestjs/common");
const types_1 = require("../../../shared/types");
const screening_handler_1 = require("../handlers/screening.handler");
const faq_handler_1 = require("../handlers/faq.handler");
const contact_handler_1 = require("../handlers/contact.handler");
const greeting_handler_1 = require("../handlers/greeting.handler");
const sleep_lab_handler_1 = require("../handlers/sleep-lab.handler");
const cpap_handler_1 = require("../handlers/cpap.handler");
const elderly_handler_1 = require("../handlers/elderly.handler");
const conversation_service_1 = require("../services/conversation.service");
const CLEAR_MENU_CHOICES = {
    'a': types_1.ConversationState.SCREENING_Q1,
    'b': types_1.ConversationState.SLEEP_LAB,
    'c': types_1.ConversationState.CPAP,
    'd': types_1.ConversationState.ELDERLY,
    'e': types_1.ConversationState.CONTACT_STAFF,
    'ประเมินความเสี่ยง': types_1.ConversationState.SCREENING_Q1,
    'นอนกรน': types_1.ConversationState.SCREENING_Q1,
    'นัดหมาย': types_1.ConversationState.SLEEP_LAB,
    'sleep lab': types_1.ConversationState.SLEEP_LAB,
    'sleep test': types_1.ConversationState.SLEEP_LAB,
    'cpap': types_1.ConversationState.CPAP,
    'หน้ากาก': types_1.ConversationState.CPAP,
    'ผู้สูงอายุ': types_1.ConversationState.ELDERLY,
    'ติดต่อเจ้าหน้าที่': types_1.ConversationState.CONTACT_STAFF,
    'แอดมิน': types_1.ConversationState.CONTACT_STAFF,
    'คุยกับคน': types_1.ConversationState.CONTACT_STAFF,
};
const MENU_MAP = {
    'a': types_1.ConversationState.SCREENING_Q1,
    'ประเมินความเสี่ยง': types_1.ConversationState.SCREENING_Q1,
    'นอนกรน': types_1.ConversationState.SCREENING_Q1,
    'b': types_1.ConversationState.SLEEP_LAB,
    'sleep lab': types_1.ConversationState.SLEEP_LAB,
    'นัดหมาย': types_1.ConversationState.SLEEP_LAB,
    'sleep test': types_1.ConversationState.SLEEP_LAB,
    'c': types_1.ConversationState.CPAP,
    'cpap': types_1.ConversationState.CPAP,
    'หน้ากาก': types_1.ConversationState.CPAP,
    'd': types_1.ConversationState.ELDERLY,
    'ผู้สูงอายุ': types_1.ConversationState.ELDERLY,
    'e': types_1.ConversationState.CONTACT_STAFF,
    'ติดต่อเจ้าหน้าที่': types_1.ConversationState.CONTACT_STAFF,
    'แอดมิน': types_1.ConversationState.CONTACT_STAFF,
    'คุยกับคน': types_1.ConversationState.CONTACT_STAFF,
};
let MessageRouter = MessageRouter_1 = class MessageRouter {
    constructor(greetingHandler, screeningHandler, faqHandler, sleepLabHandler, cpapHandler, elderlyHandler, contactHandler, conversationService) {
        this.greetingHandler = greetingHandler;
        this.screeningHandler = screeningHandler;
        this.faqHandler = faqHandler;
        this.sleepLabHandler = sleepLabHandler;
        this.cpapHandler = cpapHandler;
        this.elderlyHandler = elderlyHandler;
        this.contactHandler = contactHandler;
        this.conversationService = conversationService;
        this.logger = new common_1.Logger(MessageRouter_1.name);
    }
    async route(message, context) {
        const lower = message.toLowerCase().trim();
        const isGreeting = lower.includes('สวัสดี') || lower.includes('เริ่ม') || lower.includes('hello') ||
            lower.includes('start') || lower === 'hi' || /^hi[\s,!.]/.test(lower);
        if (isGreeting) {
            await this.conversationService.updateContext(context.userId, {
                state: types_1.ConversationState.START,
                screeningScore: 0,
            });
            this.logger.log(`[ROUTER] → GreetingHandler (reset from ${context.state})`);
            return this.greetingHandler.handle(message, { ...context, state: types_1.ConversationState.START });
        }
        const isFreeTextQuestion = message.trim().length > 20 ||
            /(คืออะไร|ใช้เมื่อไหร่|ทำอย่างไร|มีอะไรบ้าง|หรือเปล่า|อย่างไร|เมื่อไหร่|อยากรู้|อยากถาม|ขอถาม)/.test(lower) ||
            /[?？]/.test(message);
        if (isFreeTextQuestion) {
            await this.conversationService.updateContext(context.userId, { state: types_1.ConversationState.FAQ });
            this.logger.log(`[ROUTER] → FAQHandler (free text question)`);
            return this.faqHandler.handle(message, { ...context, state: types_1.ConversationState.FAQ });
        }
        const clearMenuState = this.detectClearMenuTap(lower.trim());
        const inScreening = [types_1.ConversationState.SCREENING_Q1, types_1.ConversationState.SCREENING_Q2, types_1.ConversationState.SCREENING_Q3].includes(context.state);
        if (clearMenuState) {
            this.logger.log(`[ROUTER] → Menu selected (flex): ${clearMenuState}`);
            await this.conversationService.updateContext(context.userId, { state: clearMenuState });
            const updatedContext = { ...context, state: clearMenuState };
            if (clearMenuState === types_1.ConversationState.SCREENING_Q1) {
                return this.screeningHandler.start(updatedContext);
            }
            if (clearMenuState === types_1.ConversationState.SLEEP_LAB) {
                return this.sleepLabHandler.handle(message, updatedContext);
            }
            if (clearMenuState === types_1.ConversationState.CPAP) {
                return this.cpapHandler.handle(message, updatedContext);
            }
            if (clearMenuState === types_1.ConversationState.ELDERLY) {
                return this.elderlyHandler.handle(message, updatedContext);
            }
            if (clearMenuState === types_1.ConversationState.CONTACT_STAFF) {
                return this.contactHandler.handle(message, updatedContext);
            }
        }
        if (inScreening) {
            this.logger.log(`[ROUTER] → ScreeningHandler (state=${context.state})`);
            return this.screeningHandler.handle(message, context);
        }
        if (context.state === types_1.ConversationState.START) {
            this.logger.log(`[ROUTER] → GreetingHandler (state=START)`);
            return this.greetingHandler.handle(message, context);
        }
        this.logger.log(`[ROUTER] → By state: ${context.state}`);
        switch (context.state) {
            case types_1.ConversationState.SLEEP_LAB:
                return this.sleepLabHandler.handle(message, context);
            case types_1.ConversationState.CPAP:
                return this.cpapHandler.handle(message, context);
            case types_1.ConversationState.ELDERLY:
                return this.elderlyHandler.handle(message, context);
            case types_1.ConversationState.CONTACT_STAFF:
                return this.contactHandler.handle(message, context);
            case types_1.ConversationState.SCREENING_DONE:
            case types_1.ConversationState.FAQ:
            default:
                return this.faqHandler.handle(message, context);
        }
    }
    detectClearMenuTap(trimmed) {
        if (!trimmed || trimmed.length > 18)
            return null;
        for (const [key, state] of Object.entries(CLEAR_MENU_CHOICES)) {
            if (trimmed === key || trimmed === key + 'ครับ' || trimmed === key + 'ค่ะ') {
                return state;
            }
        }
        return null;
    }
    detectMenu(lower) {
        for (const [key, state] of Object.entries(MENU_MAP)) {
            if (lower === key || lower.includes(key)) {
                return state;
            }
        }
        return null;
    }
};
exports.MessageRouter = MessageRouter;
exports.MessageRouter = MessageRouter = MessageRouter_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [greeting_handler_1.GreetingHandler,
        screening_handler_1.ScreeningHandler,
        faq_handler_1.FAQHandler,
        sleep_lab_handler_1.SleepLabHandler,
        cpap_handler_1.CPAPHandler,
        elderly_handler_1.ElderlyHandler,
        contact_handler_1.ContactHandler,
        conversation_service_1.ConversationService])
], MessageRouter);
//# sourceMappingURL=message.router.js.map