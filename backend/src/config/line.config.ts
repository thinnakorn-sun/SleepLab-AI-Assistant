import { registerAs } from '@nestjs/config';

export const lineConfig = registerAs('line', () => ({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    defaultOaId: process.env.LINE_OA_ID ?? process.env.LINE_CHANNEL_ID ?? 'default',
    defaultCenterName: process.env.DEFAULT_CENTER_NAME ?? '',
    /** เมื่อ true จะตอบแค่ผู้ใช้ใน TEST_LINE_USER_IDS เท่านั้น (legacy — ใช้ testLineUserIds โดยตรงแทน) */
    devMode: process.env.DEV_MODE === 'true',
    /** รายการ LINE userId ที่อนุญาต — ถ้ามีค่า บอทจะตอบแค่ user เหล่านี้ (คั่นด้วย comma) */
    testLineUserIds: (process.env.TEST_LINE_USER_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
}));
