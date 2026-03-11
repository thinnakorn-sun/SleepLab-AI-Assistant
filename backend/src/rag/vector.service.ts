import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { SearchContext } from '../shared/types';
import { FaqChunk } from '../knowledge-base/entities/faq-chunk.entity';
import OpenAI from 'openai';

@Injectable()
export class VectorSearchService {
    private openai: OpenAI | null = null;
    private useGemini = false;

    constructor(
        @InjectRepository(FaqChunk)
        private readonly faqRepository: Repository<FaqChunk>,
        private readonly configService: ConfigService,
    ) {
        const geminiKey = this.configService.get<string>('gemini.apiKey');
        const openaiKey = this.configService.get<string>('openai.apiKey');
        this.useGemini = !!geminiKey;
        if (openaiKey) {
            this.openai = new OpenAI({ apiKey: openaiKey });
        }
    }

    async search(query: string, limit: number = 3): Promise<SearchContext[]> {
        const queryEmbedding = await this.generateEmbedding(query);
        const embeddingStr = `[${queryEmbedding.join(',')}]`;
        const distanceExpr = `embedding <-> '${embeddingStr}'`;

        const raw = await this.faqRepository
            .createQueryBuilder('faq')
            .select(['faq.id', 'faq.content', 'faq.source'])
            .addSelect(distanceExpr, 'distance')
            .orderBy(distanceExpr)
            .addOrderBy('faq.id')  // เรียงรองเมื่อ distance เท่ากัน — ให้ผลลัพธ์สม่ำเสมอ
            .limit(limit)
            .getRawMany();

        return raw.map((r) => ({
            content: r.faq_content,
            source: r.faq_source || 'unknown',
            distance: typeof r.distance === 'number' ? r.distance : parseFloat(r.distance),
        }));
    }

    private async generateEmbedding(text: string): Promise<number[]> {
        if (this.useGemini) {
            return this.embedWithGemini(text);
        }
        if (!this.openai) {
            throw new Error('No embedding API key (GEMINI_API_KEY or OPENAI_API_KEY)');
        }
        const model = this.configService.get<string>('openai.embeddingModel') || 'text-embedding-3-small';
        const response = await this.openai.embeddings.create({
            model,
            input: text,
        });
        return response.data[0].embedding;
    }

    private async embedWithGemini(text: string): Promise<number[]> {
        const apiKey = this.configService.get<string>('gemini.apiKey');
        const model = this.configService.get<string>('gemini.embeddingModel') || 'gemini-embedding-001';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: `models/${model}`,
                content: { parts: [{ text }] },
                output_dimensionality: this.configService.get<number>('gemini.embeddingDim') ?? 768,
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini embed failed: ${res.status} ${err}`);
        }
        const data = (await res.json()) as { embedding?: { values?: number[] } };
        return data.embedding?.values ?? [];
    }
}
