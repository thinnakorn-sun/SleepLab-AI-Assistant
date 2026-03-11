/**
 * RAG Accuracy Evaluation Script
 * -------------------------------------------------------
 * ทดสอบความแม่นยำของ RAG โดยรันคำถามตัวอย่าง แล้วแสดง:
 * - chunks ที่ดึงมา + distance (ยิ่งน้อยยิ่งใกล้เคียง)
 * - คำตอบจาก AI
 *
 * Usage:
 *   npm run eval:rag
 *   npm run eval:rag -- --query "วิตามินบีช่วยการนอนอย่างไร"
 *
 * Prerequisites: .env มี GEMINI_API_KEY และ DATABASE_URL
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;

const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBEDDING_DIM = 768;

// คำถามตัวอย่างสำหรับทดสอบ (เพิ่ม/แก้ได้)
const SAMPLE_QUERIES = [
    'วิตามินบี 6 บี 12 ช่วยการนอนอย่างไร',
    'CPAP คืออะไร ใช้เมื่อไหร่',
    'ผู้สูงอายุนอนไม่หลับทำอย่างไร',
    'Sleep Test คืออะไร',
    'เมลาโทนินช่วยอะไร',
];

async function embedWithGemini(text: string): Promise<number[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: `models/${EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
            output_dimensionality: EMBEDDING_DIM,
        }),
    });
    if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { embedding?: { values?: number[] } };
    return data.embedding?.values ?? [];
}

async function generateWithGemini(prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
    });
    if (!res.ok) throw new Error(`Generate failed: ${res.status} ${await res.text()}`);
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function main() {
    const args = process.argv.slice(2);
    const queryArg = args.find((a) => a.startsWith('--query='));
    const queries = queryArg
        ? [queryArg.replace('--query=', '')]
        : SAMPLE_QUERIES;

    if (!GEMINI_API_KEY || !DATABASE_URL) {
        console.error('❌ ต้องมี GEMINI_API_KEY และ DATABASE_URL ใน .env');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });

    console.log('📊 RAG Evaluation\n');
    console.log('─'.repeat(60));

    for (const query of queries) {
        console.log(`\n🔍 Query: "${query}"\n`);

        const embedding = await embedWithGemini(query);
        const embeddingStr = `[${embedding.join(',')}]`;

        const { rows } = await pool.query(
            `SELECT content, source, (embedding <-> $1::vector) as distance
             FROM faq_chunks
             ORDER BY embedding <-> $1::vector
             LIMIT 5`,
            [embeddingStr],
        );

        if (rows.length === 0) {
            console.log('   ⚠️ ไม่พบ chunks');
            continue;
        }

        console.log('   📎 Retrieved chunks:');
        rows.forEach((r: { content: string; source: string; distance: number }, i: number) => {
            const dist = typeof r.distance === 'number' ? r.distance.toFixed(4) : r.distance;
            const preview = r.content.substring(0, 100).replace(/\n/g, ' ');
            console.log(`      #${i + 1} distance=${dist} source=${r.source}`);
            console.log(`         ${preview}...`);
        });

        const context = rows.map((r: { content: string }) => r.content).join('\n---\n');
        const prompt = `You are a medical assistant chatbot.
Answer ONLY from the provided context.
If the information is not found, reply that the system does not have information and suggest contacting staff.

Context:
${context}

Question:
${query}

Answer:`;

        const answer = await generateWithGemini(prompt);
        console.log('\n   💬 Answer:');
        console.log(`      ${answer.split('\n').join('\n      ')}`);

        // แนะนำ distance สรุป: < 0.5 ดีมาก, 0.5-1.0 ปานกลาง, > 1.0 อาจไม่ตรง
        const avgDist = rows.reduce((s: number, r: { distance: number }) => s + r.distance, 0) / rows.length;
        let quality = '🟢 ดี';
        if (avgDist > 1.0) quality = '🔴 ควรตรวจสอบ';
        else if (avgDist > 0.5) quality = '🟡 ปานกลาง';
        console.log(`\n   📈 Avg distance: ${avgDist.toFixed(4)} ${quality}`);
        console.log('─'.repeat(60));
    }

    await pool.end();
    console.log('\n✅ Done');
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
