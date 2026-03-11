import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { getHandlerFallbacks } from '../../../shared/constants/messages';
import { createFAQFlex } from '../../line/flex-templates';

@Injectable()
export class ElderlyHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<ReplyContent> {
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
