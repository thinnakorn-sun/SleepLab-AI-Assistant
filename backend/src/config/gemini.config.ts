import { registerAs } from '@nestjs/config';

export const geminiConfig = registerAs('gemini', () => ({
    apiKey: process.env.GEMINI_API_KEY,
    /** โมเดลสำหรับ embedding (Generative Language API) */
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
    embeddingDim: 768,
    chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
}));
