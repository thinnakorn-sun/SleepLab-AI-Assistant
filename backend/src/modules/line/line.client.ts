import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as line from '@line/bot-sdk';
import { ReplyContent } from '../../shared/types';

@Injectable()
export class LineClient {
    private readonly logger = new Logger(LineClient.name);
    private readonly defaultOaId: string;
    private readonly clientsByOaId = new Map<string, line.Client>();

    constructor(private readonly configService: ConfigService) {
        this.defaultOaId = this.configService.get<string>('line.defaultOaId') ?? 'default';
        this.initializeClients();
    }

    private initializeClients(): void {
        const defaultToken = this.configService.get<string>('line.channelAccessToken');
        const defaultSecret = this.configService.get<string>('line.channelSecret');
        if (defaultToken && defaultSecret) {
            this.clientsByOaId.set(
                this.defaultOaId,
                new line.Client({
                    channelAccessToken: defaultToken,
                    channelSecret: defaultSecret,
                }),
            );
        }

        // รองรับหลาย OA จาก env รูปแบบ:
        // LINE_OA_ID_<KEY>, LINE_CHANNEL_ACCESS_TOKEN_<KEY>, LINE_CHANNEL_SECRET_<KEY>
        const env = process.env as Record<string, string | undefined>;
        for (const [envKey, oaId] of Object.entries(env)) {
            if (!envKey.startsWith('LINE_OA_ID_')) continue;
            const suffix = envKey.substring('LINE_OA_ID_'.length);
            if (!suffix || !oaId) continue;

            const token = env[`LINE_CHANNEL_ACCESS_TOKEN_${suffix}`];
            const secret = env[`LINE_CHANNEL_SECRET_${suffix}`];
            if (!token || !secret) {
                this.logger.warn(`[LINE] Missing token/secret for OA suffix="${suffix}"`);
                continue;
            }

            this.clientsByOaId.set(
                oaId,
                new line.Client({
                    channelAccessToken: token,
                    channelSecret: secret,
                }),
            );
        }

        this.logger.log(`[LINE] OA clients ready: ${this.clientsByOaId.size} (default="${this.defaultOaId}")`);
    }

    private getClient(channelId?: string): line.Client {
        if (channelId && this.clientsByOaId.has(channelId)) {
            return this.clientsByOaId.get(channelId)!;
        }
        return this.clientsByOaId.get(this.defaultOaId)!;
    }

    private getClientCandidates(channelId?: string): line.Client[] {
        const ordered: line.Client[] = [];
        const seen = new Set<line.Client>();

        const pushUnique = (client?: line.Client) => {
            if (!client || seen.has(client)) return;
            seen.add(client);
            ordered.push(client);
        };

        // ถ้าระบุ channelId และมี map ตรง ให้ลองตัวนั้นก่อน
        pushUnique(channelId ? this.clientsByOaId.get(channelId) : undefined);
        // ตามด้วย default
        pushUnique(this.clientsByOaId.get(this.defaultOaId));
        // สุดท้ายลอง client อื่นทั้งหมด เผื่อ map ไม่ตรง
        for (const client of this.clientsByOaId.values()) pushUnique(client);

        return ordered;
    }

    /** ดึง display name จาก LINE Profile API */
    async getDisplayName(userId: string, channelId?: string): Promise<string | null> {
        try {
            const profile = await this.getClient(channelId).getProfile(userId);
            return profile?.displayName ?? null;
        } catch {
            return null;
        }
    }

    /** ส่งข้อความ (รองรับทั้ง text และ Flex Message) */
    async replyMessage(replyToken: string, content: ReplyContent, channelId?: string): Promise<void> {
        const message = typeof content === 'string'
            ? { type: 'text' as const, text: content }
            : {
                type: 'flex' as const,
                altText: content.flex.altText,
                contents: content.flex.contents as line.FlexContainer,
            };

        const clients = this.getClientCandidates(channelId);
        let lastError: any = null;
        for (let i = 0; i < clients.length; i++) {
            try {
                await clients[i].replyMessage(replyToken, message);
                if (i > 0) {
                    this.logger.warn(`[LINE] Reply succeeded via fallback client (attempt ${i + 1}/${clients.length})`);
                }
                return;
            } catch (err: any) {
                lastError = err;
                const detail = err?.response?.data ?? err?.message;
                this.logger.warn(`[LINE] Reply attempt ${i + 1}/${clients.length} failed: ${JSON.stringify(detail)}`);
            }
        }
        const detail = lastError?.response?.data ?? lastError?.message;
        this.logger.error(`[LINE] Reply failed: ${JSON.stringify(detail)}`);
        throw lastError;
    }

    /** ส่ง push message ไปยัง userId (ใช้สำหรับเด้งเมนูซ้ำหลังตอบ) */
    async pushMessage(to: string, content: ReplyContent, channelId?: string): Promise<void> {
        try {
            const message = typeof content === 'string'
                ? { type: 'text' as const, text: content }
                : {
                    type: 'flex' as const,
                    altText: content.flex.altText,
                    contents: content.flex.contents as line.FlexContainer,
                };
            await this.getClient(channelId).pushMessage(to, message);
        } catch (err: any) {
            const detail = err?.response?.data ?? err?.message;
            this.logger.error(`[LINE] Push failed: ${JSON.stringify(detail)}`);
        }
    }
}
