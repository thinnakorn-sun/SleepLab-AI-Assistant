import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as line from '@line/bot-sdk';
import { ReplyContent } from '../../shared/types';

@Injectable()
export class LineClient {
    private readonly logger = new Logger(LineClient.name);
    private client: line.Client;

    constructor(private readonly configService: ConfigService) {
        this.client = new line.Client({
            channelAccessToken: this.configService.get<string>('line.channelAccessToken'),
            channelSecret: this.configService.get<string>('line.channelSecret'),
        });
    }

    /** ดึง display name จาก LINE Profile API */
    async getDisplayName(userId: string): Promise<string | null> {
        try {
            const profile = await this.client.getProfile(userId);
            return profile?.displayName ?? null;
        } catch {
            return null;
        }
    }

    /** ส่งข้อความ (รองรับทั้ง text และ Flex Message) */
    async replyMessage(replyToken: string, content: ReplyContent): Promise<void> {
        try {
            const message = typeof content === 'string'
                ? { type: 'text' as const, text: content }
                : {
                    type: 'flex' as const,
                    altText: content.flex.altText,
                    contents: content.flex.contents as line.FlexContainer,
                };
            await this.client.replyMessage(replyToken, message);
        } catch (err: any) {
            const detail = err?.response?.data ?? err?.message;
            this.logger.error(`[LINE] Reply failed: ${JSON.stringify(detail)}`);
            throw err;
        }
    }

    /** ส่ง push message ไปยัง userId (ใช้สำหรับเด้งเมนูซ้ำหลังตอบ) */
    async pushMessage(to: string, content: ReplyContent): Promise<void> {
        try {
            const message = typeof content === 'string'
                ? { type: 'text' as const, text: content }
                : {
                    type: 'flex' as const,
                    altText: content.flex.altText,
                    contents: content.flex.contents as line.FlexContainer,
                };
            await this.client.pushMessage(to, message);
        } catch (err: any) {
            const detail = err?.response?.data ?? err?.message;
            this.logger.error(`[LINE] Push failed: ${JSON.stringify(detail)}`);
        }
    }
}
