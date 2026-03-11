import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { UserContext } from '../../../shared/types';
import { createContactFlex } from '../../line/flex-templates';

@Injectable()
export class ContactHandler implements MessageHandler {
    constructor(private readonly configService: ConfigService) { }

    async handle(_message: string, _context: UserContext) {
        const businessHours = this.configService.get<string>('chatbot.businessHours');
        const botName = this.configService.get<string>('chatbot.botName');
        return createContactFlex({ businessHours, botName });
    }
}
