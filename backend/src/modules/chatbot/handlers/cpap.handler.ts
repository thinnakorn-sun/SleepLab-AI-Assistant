import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { getHandlerFallbacks, CPAP_MENU_STATIC_REPLY } from '../../../shared/constants/messages';
import { createFAQFlex } from '../../line/flex-templates';

/** กดปุ่ม C จาก Flex — ให้ข้อความคงที่ ไม่ผ่าน RAG */
function isCpapMenuTap(message: string): boolean {
    return /^(c|C)(ครับ|ค่ะ)?$/.test(message.trim());
}

@Injectable()
export class CPAPHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<ReplyContent> {
        if (isCpapMenuTap(message)) {
            return CPAP_MENU_STATIC_REPLY;
        }
        const ragAnswer = await this.faqService.answer(message, context);
        if (ragAnswer) {
            const useFlex = this.configService.get<boolean>('chatbot.faqUseFlex') !== false;
            return useFlex ? createFAQFlex(ragAnswer) : ragAnswer;
        }
        const botName = this.configService.get<string>('chatbot.botName') ?? 'MOONi';
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        return getHandlerFallbacks(botName, contactKey).CPAP;
    }
}
