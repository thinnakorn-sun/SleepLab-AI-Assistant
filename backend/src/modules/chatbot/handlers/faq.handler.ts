import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { createFAQFlex } from '../../line/flex-templates';

@Injectable()
export class FAQHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<ReplyContent> {
        const answer = await this.faqService.answer(message, context);
        const useFlex = this.configService.get<boolean>('chatbot.faqUseFlex') !== false;
        if (useFlex) {
            return createFAQFlex(answer);
        }
        return answer;
    }
}
