import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { ELDERLY_MENU_STATIC_REPLY, getHandlerFallbacks } from '../../../shared/constants/messages';
import { createFAQFlex } from '../../line/flex-templates';

/** กดปุ่ม D จาก Flex — ให้ข้อความคงที่ ไม่ผ่าน RAG */
function isElderlyMenuTap(message: string): boolean {
    return /^(d|D)(ครับ|ค่ะ)?$/.test(message.trim());
}

@Injectable()
export class ElderlyHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<ReplyContent> {
        if (isElderlyMenuTap(message)) {
            return ELDERLY_MENU_STATIC_REPLY;
        }
        const ragAnswer = await this.faqService.answer(message, context);
        if (ragAnswer) {
            const useFlex = this.configService.get<boolean>('chatbot.faqUseFlex') !== false;
            return useFlex ? createFAQFlex(ragAnswer) : ragAnswer;
        }
        const botName = this.configService.get<string>('chatbot.botName') ?? 'MOONi';
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        return getHandlerFallbacks(botName, contactKey).ELDERLY;
    }
}
