import { registerAs } from '@nestjs/config';

export const lineConfig = registerAs('line', () => ({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    defaultOaId: process.env.LINE_OA_ID ?? process.env.LINE_CHANNEL_ID ?? 'default',
    defaultCenterName: process.env.DEFAULT_CENTER_NAME ?? '',
    /** เมื่อ true จะตอบแค่ผู้ใช้ใน TEST_LINE_USER_IDS เท่านั้น (ใช้ตอนพัฒนา) */
    devMode: process.env.DEV_MODE === 'true',
    /** รายการ LINE userId ที่อนุญาตเมื่อ DEV_MODE=true (คั่นด้วย comma) */
    testLineUserIds: (process.env.TEST_LINE_USER_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
}));
