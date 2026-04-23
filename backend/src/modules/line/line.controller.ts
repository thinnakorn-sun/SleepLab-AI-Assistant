import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LineService } from './line.service';
import { WebhookRequestBody } from '@line/bot-sdk';
import { normalizeLineEnvValue, resolveCenterKeyFromLineOaId } from '../../shared/oa-center';

@Controller('webhook')
export class LineWebhookController {
    private readonly logger = new Logger(LineWebhookController.name);

    constructor(
        private readonly lineService: LineService,
        private readonly configService: ConfigService,
    ) { }

    @Post()
    @HttpCode(HttpStatus.OK)
    async handleWebhook(
        @Body() body: WebhookRequestBody,
        @Headers('x-line-signature') signature: string,
        @Headers('x-line-channel-id') channelIdHeader: string | undefined,
    ) {
        const channelId = this.resolveChannelId(body, channelIdHeader);
        const events = body.events || [];
        const rawDestination = ((body as any)?.destination as string | undefined)?.trim() ?? '';
        const headerUsed = Boolean((channelIdHeader ?? '').trim());
        const centerKey = resolveCenterKeyFromLineOaId(channelId);
        const unmappedDestination =
            !headerUsed && rawDestination && channelId === rawDestination
                ? ' (ยังไม่แมป destination → ใส่ LINE_DESTINATION_THAMC_SLEEP_CENTER=... ใน env แล้ว redeploy)'
                : '';
        this.logger.log(
            `[WEBHOOK] OA resolve | x-line-channel-id=${headerUsed ? (channelIdHeader ?? '').trim() : '(none)'} | body.destination=${rawDestination || 'N/A'} | channelId=${channelId} | centerKey=${centerKey}${unmappedDestination}`,
        );
        this.logger.log(
            `[WEBHOOK] Received ${events.length} event(s) | channelId=${channelId} | destination=${body.destination ?? 'N/A'}`,
        );

        for (const event of events) {
            this.logger.log(`[WEBHOOK] Event type=${event.type} | source=${(event as any).source?.userId ?? 'N/A'}`);
        }

        await Promise.all(
            events.map(event => this.lineService.handleEvent(event, channelId))
        );

        this.logger.log(`[WEBHOOK] Done processing`);
        return 'OK';
    }

    private resolveChannelId(body: WebhookRequestBody, channelIdHeader?: string): string {
        const fromHeader = (channelIdHeader ?? '').trim();
        if (fromHeader) return fromHeader;

        const destination = ((body as any)?.destination as string | undefined)?.trim();
        if (destination) {
            const env = process.env as Record<string, string | undefined>;
            // PNK ต้องก่อน BPH: ถ้า U เดียวกันไปลงสอง key บน Render โดยไม่ตั้งใจ จะได้ PNK ไม่โดน BPH แย่ง
            const destinationMappings: Array<[string | undefined, string | undefined]> = [
                [env.LINE_DESTINATION_SLEEPVERSE_TROPMED, env.LINE_OA_ID_SLEEPVERSE_TROPMED],
                [env.LINE_DESTINATION_WUH_SLEEP_CENTER, env.LINE_OA_ID_WUH_SLEEP_CENTER],
                [env.LINE_DESTINATION_THAMC_SLEEP_CENTER, env.LINE_OA_ID_THAMC_SLEEP_CENTER],
                [env.LINE_DESTINATION_PNK_SLEEP_CENTER, env.LINE_OA_ID],
                [env.LINE_DESTINATION_BANGPLI_SLEEP_CENTER, env.LINE_OA_ID_BPH_SLEEP_LAB],
                [env.LINE_DESTINATION_BPH_SLEEP_LAB, env.LINE_OA_ID_BPH_SLEEP_LAB],
                [env.LINE_DESTINATION, env.LINE_OA_ID],
            ];
            for (const [mappedDestination, mappedOaId] of destinationMappings) {
                const d = normalizeLineEnvValue(mappedDestination);
                const oa = normalizeLineEnvValue(mappedOaId);
                if (d !== '' && oa !== '' && d === destination) {
                    return oa;
                }
            }
            // fallback: ส่ง destination ตรงไปก่อน เผื่อมีการ map ต่อในชั้นอื่น
            return destination;
        }

        return this.configService.get<string>('line.defaultOaId') ?? 'default';
    }
}
