import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { getHandlerFallbacks, SLEEP_LAB_MENU_STATIC_REPLY } from '../../../shared/constants/messages';
import { createFAQFlex } from '../../line/flex-templates';

/** กดปุ่ม B จาก Flex (ตัวอักษรเดียว) — ให้ข้อความคงที่ ไม่ผ่าน RAG */
function isSleepLabMenuTap(message: string): boolean {
    return /^(b|B)(ครับ|ค่ะ)?$/.test(message.trim());
}

@Injectable()
export class SleepLabHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<ReplyContent> {
        if (isSleepLabMenuTap(message)) {
            return SLEEP_LAB_MENU_STATIC_REPLY;
        }
        const ragAnswer = await this.faqService.answer(message, context);
        if (ragAnswer) {
            const useFlex = this.configService.get<boolean>('chatbot.faqUseFlex') !== false;
            return useFlex ? createFAQFlex(ragAnswer) : ragAnswer;
        }
        const botName = this.configService.get<string>('chatbot.botName') ?? 'MOONi';
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        return getHandlerFallbacks(botName, contactKey).SLEEP_LAB;
    }
}
