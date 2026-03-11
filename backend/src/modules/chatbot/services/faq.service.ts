import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VectorSearchService } from '../../../rag/vector.service';
import { AIService } from '../../../ai/ai.service';
import { UserContext, ConversationState } from '../../../shared/types';
import { getFaqMessages, MENU_QUERY_EXPANSION } from '../../../shared/constants/messages';

/** ขยาย query สั้น (เช่น กด C, D) เป็นคำค้นที่ตรงกับเมนู เพื่อให้ vector search ได้ผลดีขึ้น */
function expandShortQuery(message: string, state: ConversationState): string {
    const trimmed = message.trim().toLowerCase();
    if (trimmed.length > 2) return message;

    const expanded = MENU_QUERY_EXPANSION[trimmed];
    if (expanded) return expanded;

    if (state === ConversationState.CPAP) return `CPAP หน้ากาก ${message}`;
    if (state === ConversationState.ELDERLY) return `การดูแลการนอนผู้สูงอายุ ${message}`;
    if (state === ConversationState.SLEEP_LAB) return `Sleep Lab ${message}`;
    return message;
}

/** คำถามที่ส่งให้ AI — ถ้าเป็นเมนูสั้น ให้เป็นประโยคถามที่ชัดเจน เพื่อให้ AI ตอบได้ถูกต้อง */
function questionForAI(message: string, state: ConversationState): string {
    const expanded = expandShortQuery(message, state);
    if (expanded === message) return message;
    return `มีข้อมูลเกี่ยวกับ${expanded}อย่างไรบ้าง`;
}

/** Cache คำตอบ FAQ — query เดิม + context เดิม = คำตอบเดิม (ไม่สุ่ม) */
const faqAnswerCache = new Map<string, string>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;  // 24 ชม.
const cacheTimestamps = new Map<string, number>();

function getCacheKey(searchQuery: string, contextHash: string): string {
    return `${searchQuery}::${contextHash}`;
}

function hashString(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    }
    return h.toString(36);
}

/** จัดรูปแบบคำตอบให้เหมาะกับ LINE — อ่านง่าย เป็นธรรมชาติ */
function formatAnswerForLine(text: string): string {
    if (!text?.trim()) return text;
    let out = text
        .replace(/\*\*(.+?)\*\*/g, '$1')             // **bold** → plain
        .replace(/#{1,6}\s*/g, '')                   // ## headers → remove
        .replace(/^\s*[-–—]\s+/gm, '• ')            // - bullet → •
        .replace(/\n{3,}/g, '\n\n')                  // 3+ newlines → 2
        .trim();
    return out;
}

@Injectable()
export class FAQService {
    private readonly logger = new Logger(FAQService.name);

    constructor(
        private readonly vectorSearch: VectorSearchService,
        private readonly ai: AIService,
        private readonly configService: ConfigService,
    ) { }

    async answer(question: string, context: UserContext): Promise<string> {
        const openaiKey = this.configService.get<string>('openai.apiKey');
        const geminiKey = this.configService.get<string>('gemini.apiKey');
        const contactKey = this.configService.get<string>('chatbot.contactMenuKey') ?? 'E';
        const messages = getFaqMessages(contactKey);

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

            const ragDebug = this.configService.get<boolean>('chatbot.ragDebug');
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
        } catch (err) {
            const msg = (err as Error).message;
            this.logger.error(`[FAQ] Error: ${msg}`);
            if (msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED')) {
                return messages.QUOTA;
            }
            return messages.NO_API;
        }
    }
}
