import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { FAQService } from '../services/faq.service';
export declare class CPAPHandler implements MessageHandler {
    private readonly faqService;
    private readonly configService;
    constructor(faqService: FAQService, configService: ConfigService);
    handle(message: string, context: UserContext): Promise<ReplyContent>;
}
