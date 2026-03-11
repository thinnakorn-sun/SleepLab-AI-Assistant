import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserContext, ConversationState, ReplyContent } from '../../../shared/types';
import { ConversationService } from './conversation.service';
import { createScreeningResultFlex } from '../../line/flex-templates';
import { getScreeningMessages } from '../../../shared/constants/messages';

const YES_KEYWORDS = ['ใช่', 'yes', 'มี', 'ใช', 'ค่ะ', 'ครับ', 'a', 'A'];

@Injectable()
export class ScreeningService {
    constructor(
        private readonly conversationService: ConversationService,
        private readonly configService: ConfigService,
    ) { }

    async start(context: UserContext): Promise<ReplyContent> {
        await this.conversationService.updateContext(context.userId, {
            state: ConversationState.SCREENING_Q1,
            screeningScore: 0,
        });
        return this.question1();
    }

    async process(message: string, context: UserContext): Promise<ReplyContent> {
        const isYes = YES_KEYWORDS.some(k => message.includes(k));
        const score = (context.screeningScore ?? 0) + (isYes ? 1 : 0);

        switch (context.state) {
            case ConversationState.SCREENING_Q1:
                await this.conversationService.updateContext(context.userId, {
                    state: ConversationState.SCREENING_Q2,
                    screeningScore: score,
                });
                return this.question2();

            case ConversationState.SCREENING_Q2:
                await this.conversationService.updateContext(context.userId, {
                    state: ConversationState.SCREENING_Q3,
                    screeningScore: score,
                });
                return this.question3();

            case ConversationState.SCREENING_Q3:
                await this.conversationService.updateContext(context.userId, {
                    state: ConversationState.SCREENING_DONE,
                    screeningScore: score,
                });
                return this.result(score);

            default:
                // Re-start screening if called from wrong state
                return this.start(context);
        }
    }

    // ─── Questions ────────────────────────────────────────
    private getMessages() {
        const botName = this.configService.get<string>('chatbot.botName') ?? 'MOONi';
        return getScreeningMessages(botName);
    }

    private question1(): string {
        return this.getMessages().q1;
    }

    private question2(): string {
        return this.getMessages().q2;
    }

    private question3(): string {
        return this.getMessages().q3;
    }

    // ─── Result ───────────────────────────────────────────
    private result(score: number): ReplyContent {
        const msgs = this.getMessages();
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        if (score >= 2) {
            return createScreeningResultFlex(true, msgs.highRisk, contactKey);
        }
        return createScreeningResultFlex(false, msgs.lowRisk, contactKey);
    }
}
