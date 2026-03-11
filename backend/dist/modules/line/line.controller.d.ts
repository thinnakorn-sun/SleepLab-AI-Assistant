import { ConfigService } from '@nestjs/config';
import { LineService } from './line.service';
import { WebhookRequestBody } from '@line/bot-sdk';
export declare class LineWebhookController {
    private readonly lineService;
    private readonly configService;
    private readonly logger;
    constructor(lineService: LineService, configService: ConfigService);
    handleWebhook(body: WebhookRequestBody, signature: string, channelIdHeader: string | undefined): Promise<string>;
}
