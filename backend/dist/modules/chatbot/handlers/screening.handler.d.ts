import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { ScreeningService } from '../services/screening.service';
export declare class ScreeningHandler implements MessageHandler {
    private readonly screeningService;
    constructor(screeningService: ScreeningService);
    start(context: UserContext): Promise<ReplyContent>;
    handle(message: string, context: UserContext): Promise<ReplyContent>;
}
