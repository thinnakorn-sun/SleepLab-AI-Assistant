"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotConfig = void 0;
const config_1 = require("@nestjs/config");
exports.chatbotConfig = (0, config_1.registerAs)('chatbot', () => ({
    botName: process.env.BOT_NAME || 'MOONi',
    businessHours: process.env.BUSINESS_HOURS || 'จันทร์–ศุกร์ 08:00–17:00 น.',
    contactMenuKey: process.env.CONTACT_MENU_KEY || 'E',
    ragDebug: process.env.RAG_DEBUG === 'true',
    faqUseFlex: process.env.FAQ_USE_FLEX !== 'false',
    sleepHygieneArticleUrl: process.env.SLEEP_HYGIENE_ARTICLE_URL || '',
}));
//# sourceMappingURL=chatbot.config.js.map