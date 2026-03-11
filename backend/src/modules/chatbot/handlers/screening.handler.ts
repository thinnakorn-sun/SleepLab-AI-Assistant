import { Injectable } from '@nestjs/common';
import { MessageHandler } from './handler.interface';
import { ReplyContent, UserContext } from '../../../shared/types';
import { ScreeningService } from '../services/screening.service';

@Injectable()
export class ScreeningHandler implements MessageHandler {
    constructor(private readonly screeningService: ScreeningService) { }

    /** Called when user first selects menu A */
    async start(context: UserContext): Promise<ReplyContent> {
        return this.screeningService.start(context);
    }

    /** Called for Q1/Q2/Q3 answer messages */
    async handle(message: string, context: UserContext): Promise<ReplyContent> {
        return this.screeningService.process(message, context);
    }
}
