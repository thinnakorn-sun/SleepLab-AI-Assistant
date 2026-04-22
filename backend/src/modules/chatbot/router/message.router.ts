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
import { getSleepTestPackageAfterScreening } from '../../../shared/constants/messages';
import { resolveCenterKeyFromLineOaId } from '../../../shared/oa-center';

const SCREENING_SLEEP_PACKAGE_TEXT = 'ดูแพ็กเกจ sleep test';

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

/**
 * Rich menu ปุ่มบางอันตั้งใจให้แค่ “ส่งข้อความ/แสดงข้อมูล/เปิดลิงก์ฝั่งผู้ใช้”
 * แต่ webhook ของ LINE จะส่งข้อความนั้นกลับมาที่ server ทำให้บอทเผลอตอบ
 * กรณีนี้ให้ router "ไม่ตอบกลับ" (return null) เพื่อไม่ให้ไปรบกวน flow อื่น
 */
const IGNORED_RICH_MENU_MESSAGE_PATTERNS: Array<RegExp> = [
    /คำถามที่พบบ่อย/i,
    /บรรยากาศภายในศูนย์/i,
    /sleep question/i,
    /register/i,
];

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

        // ปุ่มจากผลประเมินความเสี่ยง (postback จาก Flex) — ยังไม่ดึงราคา/แพ็กเกจจากเซิร์ฟเวอร์
        if (message.trim() === 'SCREENING_SLEEP_PACKAGE') {
            if (context.state !== ConversationState.SCREENING_DONE) {
                this.logger.log(`[ROUTER] → Screening sleep package postback ignored | state=${context.state}`);
                return null;
            }
            const centerKey = resolveCenterKeyFromLineOaId(context.lineOaId);
            this.logger.log(
                `[ROUTER] → Sleep test package after screening | lineOaId=${context.lineOaId} | center=${centerKey}`,
            );
            const text = getSleepTestPackageAfterScreening(centerKey);
            await this.conversationService.updateContext(context.userId, { state: ConversationState.START });
            return text;
        }

        // ปุ่มเดียวกันแบบ type=message (บางรายอาจยังส่งข้อความ) — ต้องมาก่อน FAQ เพราะคำว่า "แพ็กเกจ" จะไป RAG
        if (context.state === ConversationState.SCREENING_DONE && lower === SCREENING_SLEEP_PACKAGE_TEXT) {
            const centerKey = resolveCenterKeyFromLineOaId(context.lineOaId);
            this.logger.log(
                `[ROUTER] → Sleep test package (text) after screening | lineOaId=${context.lineOaId} | center=${centerKey}`,
            );
            const text = getSleepTestPackageAfterScreening(centerKey);
            await this.conversationService.updateContext(context.userId, { state: ConversationState.START });
            return text;
        }

        // Rich menu "ข้อความ/ลิงก์" บางปุ่มตั้งใจให้ผู้ใช้เห็นอย่างเดียว
        // แต่ LINE webhook จะส่งข้อความนั้นกลับมาเป็น user message
        // ให้ router "ไม่ตอบกลับ" ทุกกรณีสำหรับข้อความพวกนี้
        if (IGNORED_RICH_MENU_MESSAGE_PATTERNS.some((re) => re.test(lower))) {
            this.logger.log(`[ROUTER] → Ignored rich menu message: "${message.substring(0, 50)}"`);
            return null;
        }

        // Screening ใช้คำตอบ "ใช่/ไม่ใช่" เท่านั้น:
        // ถ้าอยู่ระหว่างถามข้อ (Q1/Q2/Q3) แล้วมีข้อความอื่นจาก rich menu ส่งมา
        // เราไม่ควรให้ระบบ "ขยับไปข้อถัดไป" เพราะลูกค้าบอกว่าเหมือนบอทจำค่า
        const isYesOrNoAnswer = (() => {
            const m = message.trim();
            if (!m) return false;
            if (m.includes('ไม่ใช่') || m.includes('ไม่มี') || /^no$/i.test(m)) return true;
            if (m.includes('ใช่') || m.includes('มี') || /^yes$/i.test(m)) return true;
            return false;
        })();

        // ── กดเมนู (flex/rich menu) ต้องมาก่อนเสมอ ─────────────────────────
        // กันกรณี "ข้อความเมนูแบบยาว" ถูกตีความเป็น free-text question
        const clearMenuState = this.detectClearMenuTap(lower);
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
                const reply = await this.contactHandler.handle(message, updatedContext);
                // Contact เป็น one-shot: ส่งข้อความติดต่อแล้วกลับสู่โหมดปกติ
                await this.conversationService.updateContext(context.userId, { state: ConversationState.START });
                return reply;
            }
        }

        // Rich menu "ติดต่อเจ้าหน้าที่โทร ...": ให้ตอบ ContactHandler
        // เพื่อให้ผู้ใช้ได้ข้อมูลติดต่อกลับเหมือนเดิม แต่ไม่ไปยุ่งกับ Screening/FAQ
        if (/^ติดต่อเจ้าหน้าที่/i.test(lower)) {
            this.logger.log(`[ROUTER] → Contact selected (rich menu text): "${message.substring(0, 50)}"`);
            await this.conversationService.updateContext(context.userId, {
                state: ConversationState.CONTACT_STAFF,
            });
            const reply = await this.contactHandler.handle(message, { ...context, state: ConversationState.CONTACT_STAFF });
            // Contact เป็น one-shot: ส่งข้อความติดต่อแล้วกลับสู่โหมดปกติ
            await this.conversationService.updateContext(context.userId, { state: ConversationState.START });
            return reply;
        }

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
            /(คืออะไร|ใช้เมื่อไหร่|ทำอย่างไร|มีอะไรบ้าง|หรือเปล่า|อย่างไร|เมื่อไหร่|อยากรู้|อยากถาม|ขอถาม|ต้องทำยังไง|ทำยังไง|ช่วย|แนะนำ|ราคา|ค่าบริการ|แพ็กเกจ)/.test(lower) ||
            /[?？]/.test(message);
        if (isFreeTextQuestion) {
            await this.conversationService.updateContext(context.userId, { state: ConversationState.FAQ });
            this.logger.log(`[ROUTER] → FAQHandler (free text question)`);
            return this.faqHandler.handle(message, { ...context, state: ConversationState.FAQ });
        }

        // ── Screening flow — answer to Q1/Q2/Q3 ─────────────
        if (inScreening) {
            if (!isYesOrNoAnswer) {
                this.logger.log(`[ROUTER] → Screening ignored (not yes/no) | state=${context.state} | text="${message.substring(0, 50)}"`);
                return null;
            }
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
        const value = trimmed?.trim();
        if (!value) return null;

        // A/B/C/D/E แบบปุ่มจริง: ต้องเป็นตัวอักษรเดี่ยวเท่านั้น
        if (/^(a|b|c|d|e)(ครับ|ค่ะ)?$/.test(value)) {
            const key = value.replace(/(ครับ|ค่ะ)$/g, '');
            return CLEAR_MENU_CHOICES[key] ?? null;
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
