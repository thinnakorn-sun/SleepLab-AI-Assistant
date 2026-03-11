"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FAQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const vector_service_1 = require("../../../rag/vector.service");
const ai_service_1 = require("../../../ai/ai.service");
const types_1 = require("../../../shared/types");
const messages_1 = require("../../../shared/constants/messages");
function expandShortQuery(message, state) {
    const trimmed = message.trim().toLowerCase();
    if (trimmed.length > 2)
        return message;
    const expanded = messages_1.MENU_QUERY_EXPANSION[trimmed];
    if (expanded)
        return expanded;
    if (state === types_1.ConversationState.CPAP)
        return `CPAP หน้ากาก ${message}`;
    if (state === types_1.ConversationState.ELDERLY)
        return `การดูแลการนอนผู้สูงอายุ ${message}`;
    if (state === types_1.ConversationState.SLEEP_LAB)
        return `Sleep Lab ${message}`;
    return message;
}
function questionForAI(message, state) {
    const expanded = expandShortQuery(message, state);
    if (expanded === message)
        return message;
    return `มีข้อมูลเกี่ยวกับ${expanded}อย่างไรบ้าง`;
}
const faqAnswerCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cacheTimestamps = new Map();
function getCacheKey(searchQuery, contextHash) {
    return `${searchQuery}::${contextHash}`;
}
function hashString(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    }
    return h.toString(36);
}
function formatAnswerForLine(text) {
    if (!text?.trim())
        return text;
    let out = text
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/#{1,6}\s*/g, '')
        .replace(/^\s*[-–—]\s+/gm, '• ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    return out;
}
let FAQService = FAQService_1 = class FAQService {
    constructor(vectorSearch, ai, configService) {
        this.vectorSearch = vectorSearch;
        this.ai = ai;
        this.configService = configService;
        this.logger = new common_1.Logger(FAQService_1.name);
    }
    async answer(question, context) {
        const openaiKey = this.configService.get('openai.apiKey');
        const geminiKey = this.configService.get('gemini.apiKey');
        const contactKey = this.configService.get('chatbot.contactMenuKey') ?? 'E';
        const messages = (0, messages_1.getFaqMessages)(contactKey);
        if (!openaiKey?.trim() && !geminiKey?.trim()) {
            this.logger.warn('[FAQ] No API key (OPENAI or GEMINI)');
            return messages.NO_API;
        }
        try {
            const searchQuery = expandShortQuery(question, context.state);
            const aiQuestion = questionForAI(question, context.state);
            if (searchQuery !== question) {
                this.logger.log(`[FAQ] Query expanded: "${question}" → "${searchQuery}"`);
            }
            const searchResults = await this.vectorSearch.search(searchQuery, 5);
            const ragDebug = this.configService.get('chatbot.ragDebug');
            if (ragDebug) {
                this.logger.log(`[FAQ] RAG_DEBUG | query="${searchQuery}" | chunks=${searchResults.length}`);
                searchResults.forEach((r, i) => {
                    const dist = r.distance != null ? r.distance.toFixed(4) : '?';
                    const preview = r.content.substring(0, 80).replace(/\n/g, ' ');
                    this.logger.log(`[FAQ]   #${i + 1} distance=${dist} source=${r.source} | ${preview}...`);
                });
            }
            if (!searchResults || searchResults.length === 0) {
                this.logger.log('[FAQ] No search results');
                return messages.NO_DATA;
            }
            const compiledContext = searchResults.map(s => s.content).join('\n---\n');
            const contextHash = hashString(compiledContext);
            const cacheKey = getCacheKey(searchQuery, contextHash);
            const cached = faqAnswerCache.get(cacheKey);
            const cachedAt = cacheTimestamps.get(cacheKey);
            if (cached && cachedAt && Date.now() - cachedAt < CACHE_TTL_MS) {
                this.logger.debug(`[FAQ] Cache hit: "${searchQuery.substring(0, 30)}..."`);
                return cached;
            }
            let answer = await this.ai.generateAnswer(aiQuestion, compiledContext);
            answer = formatAnswerForLine(answer);
            faqAnswerCache.set(cacheKey, answer);
            cacheTimestamps.set(cacheKey, Date.now());
            return answer;
        }
        catch (err) {
            const msg = err.message;
            this.logger.error(`[FAQ] Error: ${msg}`);
            if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                return messages.QUOTA;
            }
            return messages.NO_API;
        }
    }
};
exports.FAQService = FAQService;
exports.FAQService = FAQService = FAQService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [vector_service_1.VectorSearchService,
        ai_service_1.AIService,
        config_1.ConfigService])
], FAQService);
//# sourceMappingURL=faq.service.js.map