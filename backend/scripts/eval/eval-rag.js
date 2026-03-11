"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const DATABASE_URL = process.env.DATABASE_URL;
const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBEDDING_DIM = 768;
const SAMPLE_QUERIES = [
    'วิตามินบี 6 บี 12 ช่วยการนอนอย่างไร',
    'CPAP คืออะไร ใช้เมื่อไหร่',
    'ผู้สูงอายุนอนไม่หลับทำอย่างไร',
    'Sleep Test คืออะไร',
    'เมลาโทนินช่วยอะไร',
];
async function embedWithGemini(text) {
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
    if (!res.ok)
        throw new Error(`Embed failed: ${res.status} ${await res.text()}`);
    const data = (await res.json());
    return data.embedding?.values ?? [];
}
async function generateWithGemini(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 1024 },
        }),
    });
    if (!res.ok)
        throw new Error(`Generate failed: ${res.status} ${await res.text()}`);
    const data = (await res.json());
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
    const pool = new pg_1.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });
    console.log('📊 RAG Evaluation\n');
    console.log('─'.repeat(60));
    for (const query of queries) {
        console.log(`\n🔍 Query: "${query}"\n`);
        const embedding = await embedWithGemini(query);
        const embeddingStr = `[${embedding.join(',')}]`;
        const { rows } = await pool.query(`SELECT content, source, (embedding <-> $1::vector) as distance
             FROM faq_chunks
             ORDER BY embedding <-> $1::vector
             LIMIT 5`, [embeddingStr]);
        if (rows.length === 0) {
            console.log('   ⚠️ ไม่พบ chunks');
            continue;
        }
        console.log('   📎 Retrieved chunks:');
        rows.forEach((r, i) => {
            const dist = typeof r.distance === 'number' ? r.distance.toFixed(4) : r.distance;
            const preview = r.content.substring(0, 100).replace(/\n/g, ' ');
            console.log(`      #${i + 1} distance=${dist} source=${r.source}`);
            console.log(`         ${preview}...`);
        });
        const context = rows.map((r) => r.content).join('\n---\n');
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
        const avgDist = rows.reduce((s, r) => s + r.distance, 0) / rows.length;
        let quality = '🟢 ดี';
        if (avgDist > 1.0)
            quality = '🔴 ควรตรวจสอบ';
        else if (avgDist > 0.5)
            quality = '🟡 ปานกลาง';
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
//# sourceMappingURL=eval-rag.js.map