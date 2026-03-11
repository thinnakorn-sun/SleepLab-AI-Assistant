"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lineConfig = void 0;
const config_1 = require("@nestjs/config");
exports.lineConfig = (0, config_1.registerAs)('line', () => ({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
    defaultOaId: process.env.LINE_OA_ID ?? process.env.LINE_CHANNEL_ID ?? 'default',
    defaultCenterName: process.env.DEFAULT_CENTER_NAME ?? '',
    devMode: process.env.DEV_MODE === 'true',
    testLineUserIds: (process.env.TEST_LINE_USER_IDS ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
}));
//# sourceMappingURL=line.config.js.map