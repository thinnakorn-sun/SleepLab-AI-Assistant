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
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash';
const EMBEDDING_DIM = 768;
async function embed(text) {
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
        throw new Error(`Embed failed: ${res.status}`);
    const data = (await res.json());
    return data.embedding?.values ?? [];
}
async function generate(prompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 4096 },
        }),
    });
    if (!res.ok)
        throw new Error(`Generate failed: ${res.status}`);
    const data = (await res.json());
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}
function checkGrounding(context, answer) {
    const ctxWords = new Set(context
        .replace(/[^\u0E00-\u0E7FA-Za-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3));
    const ansWords = answer
        .replace(/[^\u0E00-\u0E7FA-Za-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 3);
    const matched = [];
    for (const w of ansWords) {
        if (ctxWords.has(w))
            matched.push(w);
    }
    const score = ansWords.length > 0 ? matched.length / ansWords.length : 0;
    return { score, matched: matched.slice(0, 15) };
}
async function main() {
    const args = process.argv.slice(2);
    const queryArg = args.find((a) => a.startsWith('--query='));
    const query = queryArg ? queryArg.replace('--query=', '') : 'CPAP คืออะไร ใช้เมื่อไหร่';
    if (!GEMINI_API_KEY || !DATABASE_URL) {
        console.error('❌ ต้องมี GEMINI_API_KEY และ DATABASE_URL ใน .env');
        process.exit(1);
    }
    const pool = new pg_1.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });
    console.log('🔍 ตรวจสอบ RAG: AI ใช้ข้อมูลจากเอกสารจริงหรือไม่\n');
    console.log('═'.repeat(70));
    const { rows: countRows } = await pool.query('SELECT COUNT(*) as total FROM faq_chunks WHERE embedding IS NOT NULL');
    const totalChunks = parseInt(countRows[0]?.total ?? '0', 10);
    console.log(`\n📊 จำนวน chunks ใน vector DB: ${totalChunks.toLocaleString()} ชิ้น`);
    if (totalChunks === 0) {
        console.log('   ⚠️ ไม่มีข้อมูล — รัน npm run index:pdf ก่อน');
        await pool.end();
        process.exit(1);
    }
    console.log(`\n🔎 Query: "${query}"`);
    const embedding = await embed(query);
    const embeddingStr = `[${embedding.join(',')}]`;
    const { rows } = await pool.query(`SELECT content, source, (embedding <-> $1::vector) as distance
         FROM faq_chunks
         ORDER BY embedding <-> $1::vector, id
         LIMIT 5`, [embeddingStr]);
    if (rows.length === 0) {
        console.log('   ⚠️ ไม่พบ chunks ที่ตรงกับ query');
        await pool.end();
        return;
    }
    const context = rows.map((r) => r.content).join('\n---\n');
    console.log('\n📎 Chunks ที่ดึงมา (จากเอกสารใน vector):');
    rows.forEach((r, i) => {
        const dist = typeof r.distance === 'number' ? r.distance.toFixed(4) : r.distance;
        console.log(`\n   [#${i + 1}] distance=${dist} | source=${r.source}`);
        console.log(`   ${r.content.substring(0, 300).replace(/\n/g, '\n   ')}${r.content.length > 300 ? '...' : ''}`);
    });
    const prompt = `You are a medical assistant. Answer ONLY from the Context. Do not add information not in Context.

Context:
${context}

Question: ${query}

Answer:`;
    console.log('\n⏳ กำลังให้ AI สร้างคำตอบจาก context ข้างบน...');
    const answer = await generate(prompt);
    console.log('\n💬 คำตอบจาก AI:');
    console.log('─'.repeat(70));
    console.log(answer);
    console.log('─'.repeat(70));
    const { score, matched } = checkGrounding(context, answer);
    const pct = (score * 100).toFixed(0);
    let verdict = '🔴 น่าจะไม่ใช้ข้อมูลจากเอกสาร';
    if (score >= 0.5)
        verdict = '🟢 ใช้ข้อมูลจากเอกสาร (grounded)';
    else if (score >= 0.3)
        verdict = '🟡 ใช้บางส่วน';
    console.log(`\n📈 Grounding check: ${pct}% ของคำในคำตอบมีใน context`);
    console.log(`   ${verdict}`);
    console.log(`   ตัวอย่างคำที่ match: ${matched.slice(0, 10).join(', ')}`);
    await pool.end();
    console.log('\n✅ เสร็จสิ้น');
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=verify-rag.js.map