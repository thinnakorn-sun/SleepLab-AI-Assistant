import { Injectable } from '@nestjs/common';
import { PromptBuilder } from './prompt.builder';
import { AIProvider } from './ai.interface';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AIService implements AIProvider {
    private openai: OpenAI | null = null;
    private useGemini = false;

    constructor(
        private readonly promptBuilder: PromptBuilder,
        private readonly configService: ConfigService,
    ) {
        const geminiKey = this.configService.get<string>('gemini.apiKey');
        const openaiKey = this.configService.get<string>('openai.apiKey');
        this.useGemini = !!geminiKey?.trim();
        if (openaiKey?.trim()) {
            this.openai = new OpenAI({ apiKey: openaiKey });
        }
    }

    async generate(prompt: string): Promise<string> {
        if (this.useGemini) {
            return this.generateWithGemini(prompt);
        }
        if (!this.openai) {
            throw new Error('No AI API key (GEMINI_API_KEY or OPENAI_API_KEY)');
        }
        const response = await this.openai.chat.completions.create({
            model: this.configService.get<string>('openai.modelName') || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
        });
        return response.choices[0].message.content || '';
    }

    private async generateWithGemini(prompt: string): Promise<string> {
        const apiKey = this.configService.get<string>('gemini.apiKey');
        const model = this.configService.get<string>('gemini.chatModel') || 'gemini-2.5-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0,
                    maxOutputTokens: 4096,
                    seed: 42,  // ช่วยให้ผลลัพธ์สม่ำเสมอกว่า (best effort)
                },
            }),
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini generate failed: ${res.status} ${err}`);
        }
        const data = (await res.json()) as {
            candidates?: { content?: { parts?: { text?: string }[] } }[];
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return text.trim();
    }

    async generateAnswer(question: string, context: string): Promise<string> {
        const prompt = this.promptBuilder.buildMedicalPrompt(question, context);
        return this.generate(prompt);
    }
}
