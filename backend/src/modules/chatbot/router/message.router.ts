import { Injectable, Logger } from '@nestjs/common';
import { ReplyContent, UserContext, ConversationState } from '../../../shared/types';
import { ScreeningHandler } from '../handlers/screening.handler';
import { FAQHandler } from '../handlers/faq.handler';
import { ContactHandler } from '../handlers/contact.handler';
import { GreetingHandler } from '../handlers/greeting.handler';
import { SleepLabHandler } from '../handlers/sleep-lab.handler';
import { CPAPHandler } from '../handlers/cpap.handler';
import { ElderlyHandler } from '../handlers/elderly.handler';
import { ConversationService } from '../services/conversation.service';

/** คำที่ถือว่าเป็นการกดเมนู (flex) — สั้น ตรงกับปุ่ม */
const CLEAR_MENU_CHOICES: Record<string, ConversationState> = {
    'a': ConversationState.SCREENING_Q1,
    'b': ConversationState.SLEEP_LAB,
    'c': ConversationState.CPAP,
    'd': ConversationState.ELDERLY,
    'e': ConversationState.CONTACT_STAFF,
    'ประเมินความเสี่ยง': ConversationState.SCREENING_Q1,
    'นอนกรน': ConversationState.SCREENING_Q1,
    'นัดหมาย': ConversationState.SLEEP_LAB,
    'sleep lab': ConversationState.SLEEP_LAB,
    'sleep test': ConversationState.SLEEP_LAB,
    'cpap': ConversationState.CPAP,
    'หน้ากาก': ConversationState.CPAP,
    'ผู้สูงอายุ': ConversationState.ELDERLY,
    'ติดต่อเจ้าหน้าที่': ConversationState.CONTACT_STAFF,
    'แอดมิน': ConversationState.CONTACT_STAFF,
    'คุยกับคน': ConversationState.CONTACT_STAFF,
};

/** Menu selections: match letter (A/B/C/D/E) or Thai keyword */
const MENU_MAP: Record<string, ConversationState> = {
    // A — Screening
    'a': ConversationState.SCREENING_Q1,
    'ประเมินความเสี่ยง': ConversationState.SCREENING_Q1,
    'นอนกรน': ConversationState.SCREENING_Q1,
    // B — Sleep Lab
    'b': ConversationState.SLEEP_LAB,
    'sleep lab': ConversationState.SLEEP_LAB,
    'นัดหมาย': ConversationState.SLEEP_LAB,
    'sleep test': ConversationState.SLEEP_LAB,
    // C — CPAP
    'c': ConversationState.CPAP,
    'cpap': ConversationState.CPAP,
    'หน้ากาก': ConversationState.CPAP,
    // D — Elderly
    'd': ConversationState.ELDERLY,
    'ผู้สูงอายุ': ConversationState.ELDERLY,
    // E — Contact
    'e': ConversationState.CONTACT_STAFF,
    'ติดต่อเจ้าหน้าที่': ConversationState.CONTACT_STAFF,
    'แอดมิน': ConversationState.CONTACT_STAFF,
    'คุยกับคน': ConversationState.CONTACT_STAFF,
};

@Injectable()
export class MessageRouter {
    private readonly logger = new Logger(MessageRouter.name);

    constructor(
        private readonly greetingHandler: GreetingHandler,
        private readonly screeningHandler: ScreeningHandler,
        private readonly faqHandler: FAQHandler,
        private readonly sleepLabHandler: SleepLabHandler,
        private readonly cpapHandler: CPAPHandler,
        private readonly elderlyHandler: ElderlyHandler,
        private readonly contactHandler: ContactHandler,
        private readonly conversationService: ConversationService,
    ) { }

    async route(message: string, context: UserContext): Promise<ReplyContent> {
        const lower = message.toLowerCase().trim();

        // ── Greeting = เริ่มใหม่เสมอ (แม้อยู่ใน screening) ───
        // ป้องกันกรณีบล็อก/ปลดบล็อก/ทักใหม่ — ไม่ให้ค้างที่ Q2/Q3
        const isGreeting =
            lower.includes('สวัสดี') || lower.includes('เริ่ม') || lower.includes('hello') ||
            lower.includes('start') || lower === 'hi' || /^hi[\s,!.]/.test(lower);
        if (isGreeting) {
            await this.conversationService.updateContext(context.userId, {
                state: ConversationState.START,
                screeningScore: 0,
            });
            this.logger.log(`[ROUTER] → GreetingHandler (reset from ${context.state})`);
            return this.greetingHandler.handle(message, { ...context, state: ConversationState.START });
        }

        // ── พิมพ์ถามเอง = ไป FAQ/RAG (vector) เสมอ ───────────────────────────
        // ไม่ใช้ flex → ให้ chatbot หาข้อมูลจาก vector ตอบ (ไม่สน state)
        const isFreeTextQuestion =
            message.trim().length > 20 ||
            /(คืออะไร|ใช้เมื่อไหร่|ทำอย่างไร|มีอะไรบ้าง|หรือเปล่า|อย่างไร|เมื่อไหร่|อยากรู้|อยากถาม|ขอถาม)/.test(lower) ||
            /[?？]/.test(message);
        if (isFreeTextQuestion) {
            await this.conversationService.updateContext(context.userId, { state: ConversationState.FAQ });
            this.logger.log(`[ROUTER] → FAQHandler (free text question)`);
            return this.faqHandler.handle(message, { ...context, state: ConversationState.FAQ });
        }

        // ── กดเมนู (flex) = ตามโฟลว์ ───────────────────────────────────────
        const clearMenuState = this.detectClearMenuTap(lower.trim());
        const inScreening = [ConversationState.SCREENING_Q1, ConversationState.SCREENING_Q2, ConversationState.SCREENING_Q3].includes(context.state);

        if (clearMenuState) {
            this.logger.log(`[ROUTER] → Menu selected (flex): ${clearMenuState}`);
            await this.conversationService.updateContext(context.userId, { state: clearMenuState });
            const updatedContext = { ...context, state: clearMenuState };

            if (clearMenuState === ConversationState.SCREENING_Q1) {
                return this.screeningHandler.start(updatedContext);
            }
            if (clearMenuState === ConversationState.SLEEP_LAB) {
                return this.sleepLabHandler.handle(message, updatedContext);
            }
            if (clearMenuState === ConversationState.CPAP) {
                return this.cpapHandler.handle(message, updatedContext);
            }
            if (clearMenuState === ConversationState.ELDERLY) {
                return this.elderlyHandler.handle(message, updatedContext);
            }
            if (clearMenuState === ConversationState.CONTACT_STAFF) {
                return this.contactHandler.handle(message, updatedContext);
            }
        }

        // ── Screening flow — answer to Q1/Q2/Q3 ─────────────
        if (inScreening) {
            this.logger.log(`[ROUTER] → ScreeningHandler (state=${context.state})`);
            return this.screeningHandler.handle(message, context);
        }

        // ── Greeting triggers (เมื่อ state=START — คำทักทายจัดการด้านบนแล้ว) ─────────
        if (context.state === ConversationState.START) {
            this.logger.log(`[ROUTER] → GreetingHandler (state=START)`);
            return this.greetingHandler.handle(message, context);
        }

        // ── Contextual follow-up based on current state ──────
        this.logger.log(`[ROUTER] → By state: ${context.state}`);
        switch (context.state) {
            case ConversationState.SLEEP_LAB:
                return this.sleepLabHandler.handle(message, context);
            case ConversationState.CPAP:
                return this.cpapHandler.handle(message, context);
            case ConversationState.ELDERLY:
                return this.elderlyHandler.handle(message, context);
            case ConversationState.CONTACT_STAFF:
                return this.contactHandler.handle(message, context);
            case ConversationState.SCREENING_DONE:
            case ConversationState.FAQ:
            default:
                return this.faqHandler.handle(message, context);
        }
    }

    /** ตรวจว่าเป็นการกดเมนู (flex) — ข้อความสั้น ตรงกับปุ่ม */
    private detectClearMenuTap(trimmed: string): ConversationState | null {
        if (!trimmed || trimmed.length > 18) return null;
        for (const [key, state] of Object.entries(CLEAR_MENU_CHOICES)) {
            if (trimmed === key || trimmed === key + 'ครับ' || trimmed === key + 'ค่ะ') {
                return state;
            }
        }
        return null;
    }

    private detectMenu(lower: string): ConversationState | null {
        for (const [key, state] of Object.entries(MENU_MAP)) {
            if (lower === key || lower.includes(key)) {
                return state;
            }
        }
        return null;
    }
}
