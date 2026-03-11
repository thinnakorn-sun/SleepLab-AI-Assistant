import { ConfigService } from '@nestjs/config';
import { MessageHandler } from './handler.interface';
import { UserContext } from '../../../shared/types';
export declare class ContactHandler implements MessageHandler {
    private readonly configService;
    constructor(configService: ConfigService);
    handle(_message: string, _context: UserContext): Promise<import("../../line/flex-templates").FlexReply>;
}
