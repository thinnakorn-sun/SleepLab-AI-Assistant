import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { UserContext } from '../../../shared/types';
import { OASettingsService } from '../services/oa-settings.service';
export declare class GreetingHandler implements MessageHandler {
    private readonly oaSettingsService;
    private readonly configService;
    constructor(oaSettingsService: OASettingsService, configService: ConfigService);
    handle(_message: string, context: UserContext): Promise<import("../../line/flex-templates").FlexReply>;
}
