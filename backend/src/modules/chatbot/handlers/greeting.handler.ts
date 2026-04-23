import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { UserContext } from '../../../shared/types';
import { OASettingsService } from '../services/oa-settings.service';
import { createGreetingFlex } from '../../line/flex-templates';
import { resolveGreetingHeaderLine } from '../../../shared/oa-center';

@Injectable()
export class GreetingHandler implements MessageHandler {
    constructor(
        private readonly oaSettingsService: OASettingsService,
        private readonly configService: ConfigService,
    ) { }

    async handle(_message: string, context: UserContext) {
        const centerName = await this.oaSettingsService.getCenterName(context.lineOaId);
        const botName = this.configService.get<string>('chatbot.botName');
        const headerLine = resolveGreetingHeaderLine(context.lineOaId) ?? undefined;
        return createGreetingFlex(centerName, { botName, headerLine, lineOaId: context.lineOaId });
    }
}
