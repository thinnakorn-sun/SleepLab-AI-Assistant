import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
import { getHandlerFallbacks } from '../../../shared/constants/messages';

@Injectable()
export class SleepLabHandler implements MessageHandler {
    constructor(
        private readonly faqService: FAQService,
        private readonly configService: ConfigService,
    ) { }

    async handle(message: string, context: UserContext): Promise<string> {
        const ragAnswer = await this.faqService.answer(message, context);
        if (ragAnswer) return ragAnswer;

        const botName = this.configService.get<string>('chatbot.botName') ?? 'MOONi';
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        return getHandlerFallbacks(botName, contactKey).SLEEP_LAB;
    }
}
