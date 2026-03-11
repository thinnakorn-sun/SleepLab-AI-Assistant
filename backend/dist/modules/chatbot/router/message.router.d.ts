import { ReplyContent, UserContext } from '../../../shared/types';
import { ScreeningHandler } from '../handlers/screening.handler';
import { FAQHandler } from '../handlers/faq.handler';
import { ContactHandler } from '../handlers/contact.handler';
import { GreetingHandler } from '../handlers/greeting.handler';
import { SleepLabHandler } from '../handlers/sleep-lab.handler';
import { CPAPHandler } from '../handlers/cpap.handler';
import { ElderlyHandler } from '../handlers/elderly.handler';
import { ConversationService } from '../services/conversation.service';
export declare class MessageRouter {
    private readonly greetingHandler;
    private readonly screeningHandler;
    private readonly faqHandler;
    private readonly sleepLabHandler;
    private readonly cpapHandler;
    private readonly elderlyHandler;
    private readonly contactHandler;
    private readonly conversationService;
    private readonly logger;
    constructor(greetingHandler: GreetingHandler, screeningHandler: ScreeningHandler, faqHandler: FAQHandler, sleepLabHandler: SleepLabHandler, cpapHandler: CPAPHandler, elderlyHandler: ElderlyHandler, contactHandler: ContactHandler, conversationService: ConversationService);
    route(message: string, context: UserContext): Promise<ReplyContent>;
    private detectClearMenuTap;
    private detectMenu;
}
