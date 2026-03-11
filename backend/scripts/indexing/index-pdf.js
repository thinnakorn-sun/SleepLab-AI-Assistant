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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
const pdfParse = require('pdf-parse');
const pg_1 = require("pg");
const openai_1 = __importDefault(require("openai"));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USE_GEMINI = !!GEMINI_API_KEY;
const EMBEDDING_DIM = USE_GEMINI ? 768 : 1536;
const EMBEDDING_MODEL = USE_GEMINI ? 'text-embedding-004' : 'text-embedding-3-small';
const CHUNK_SIZE_CHARS = 600;
const CHUNK_OVERLAP_CHARS = 100;
const BATCH_SIZE = USE_GEMINI ? 10 : 20;
const DB_CONFIG = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
};
const openai = OPENAI_API_KEY ? new openai_1.default({ apiKey: OPENAI_API_KEY }) : null;
async function extractText(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.txt') {
        console.log(`📄 Reading TXT: ${filePath}`);
        const text = fs.readFileSync(filePath, 'utf-8');
        console.log(`   Characters: ${text.length.toLocaleString()}`);
        return text;
    }
    if (ext === '.pdf') {
        console.log(`📄 Parsing PDF: ${filePath}`);
        const buf = fs.readFileSync(filePath);
        const { text } = await pdfParse(buf);
        console.log(`   Characters extracted: ${text.length.toLocaleString()}`);
        if (text.length < 500) {
            console.warn('⚠️  Very little text from PDF (possible encoding issue).');
            console.warn('   Consider saving a knowledge-base.txt instead.');
        }
        return text;
    }
    throw new Error(`Unsupported file: ${ext}. Use .pdf or .txt`);
}
function splitTextIntoChunks(text) {
    const chunks = [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = normalized.split(/\n\n+/);
    let current = '';
    for (const para of paragraphs) {
        if (para.length > CHUNK_SIZE_CHARS) {
            if (current.trim()) {
                chunks.push(current.trim());
                current = '';
            }
            for (let i = 0; i < para.length; i += CHUNK_SIZE_CHARS - CHUNK_OVERLAP_CHARS) {
                const chunk = para.slice(i, i + CHUNK_SIZE_CHARS);
                if (chunk.trim().length > 20)
                    chunks.push(chunk.trim());
            }
            continue;
        }
        if ((current + (current ? '\n\n' : '') + para).length <= CHUNK_SIZE_CHARS) {
            current = current ? current + '\n\n' + para : para;
        }
        else {
            if (current.trim())
                chunks.push(current.trim());
            const overlap = current.slice(-CHUNK_OVERLAP_CHARS);
            current = overlap ? overlap + '\n\n' + para : para;
        }
    }
    if (current.trim())
        chunks.push(current.trim());
    return chunks.filter((c) => c.length > 20);
}
async function embedBatchGemini(texts) {
    const model = 'gemini-embedding-001';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:batchEmbedContents?key=${GEMINI_API_KEY}`;
    const body = {
        requests: texts.map((text) => ({
            model: `models/${model}`,
            content: { parts: [{ text }] },
            output_dimensionality: 768,
        })),
    };
    for (let attempt = 1; attempt <= 5; attempt++) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (res.status === 429) {
            const wait = Math.min(60000, 5000 * Math.pow(2, attempt));
            console.log(`   ⏳ Rate limited, waiting ${wait / 1000}s...`);
            await new Promise((r) => setTimeout(r, wait));
            continue;
        }
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Gemini embed failed: ${res.status} ${err}`);
        }
        const data = (await res.json());
        return (data.embeddings ?? []).map((e) => e.values ?? []);
    }
    throw new Error('Gemini rate limit: too many retries');
}
async function embedBatchOpenAI(texts) {
    const response = await openai.embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
    });
    return response.data.map((d) => d.embedding);
}
async function embedBatch(texts) {
    return USE_GEMINI ? embedBatchGemini(texts) : embedBatchOpenAI(texts);
}
async function main() {
    if (!GEMINI_API_KEY && !OPENAI_API_KEY) {
        console.error('❌ Set GEMINI_API_KEY or OPENAI_API_KEY in .env');
        process.exit(1);
    }
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in .env');
        process.exit(1);
    }
    console.log(`\n📌 Using ${USE_GEMINI ? 'Gemini' : 'OpenAI'} embeddings (dim=${EMBEDDING_DIM})\n`);
    const args = process.argv.slice(2);
    const fileArgIndex = args.indexOf('--file');
    const limitArgIndex = args.indexOf('--limit');
    const sourceFile = fileArgIndex !== -1 && args[fileArgIndex + 1]
        ? args[fileArgIndex + 1]
        : 'knowledge-base.txt';
    const chunkLimit = limitArgIndex !== -1 && args[limitArgIndex + 1]
        ? parseInt(args[limitArgIndex + 1], 10)
        : 0;
    const filePath = path.isAbsolute(sourceFile)
        ? sourceFile
        : path.resolve(__dirname, '../../', sourceFile);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ File not found: ${filePath}`);
        console.error(`   ใช้ path แบบ absolute หรือวางไฟล์ใน backend/ แล้วระบุชื่อไฟล์`);
        process.exit(1);
    }
    const sourceLabel = path.basename(filePath);
    const rawText = await extractText(filePath);
    if (rawText.length < 100) {
        console.error('❌ Not enough text to index. Check the file.');
        process.exit(1);
    }
    console.log(`✂️  Chunking (size=${CHUNK_SIZE_CHARS}, overlap=${CHUNK_OVERLAP_CHARS})...`);
    let chunks = splitTextIntoChunks(rawText);
    if (chunkLimit > 0) {
        chunks = chunks.slice(0, chunkLimit);
        console.log(`   Chunks: ${chunks.length} (--limit ${chunkLimit})`);
    }
    else {
        console.log(`   Chunks: ${chunks.length}`);
    }
    if (!USE_GEMINI) {
        console.log(`   Est. cost: ~$${((chunks.length * 0.02) / 1000).toFixed(4)} USD (OpenAI)`);
    }
    else {
        console.log(`   (Gemini embedding: free tier available)`);
    }
    if (chunks.length === 0) {
        console.error('❌ No chunks generated.');
        process.exit(1);
    }
    console.log(`\n🔌 Connecting to database...`);
    const pool = new pg_1.Pool(DB_CONFIG);
    const client = await pool.connect();
    try {
        await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
        const tableExists = await client.query(`SELECT 1 FROM information_schema.tables WHERE table_name = 'faq_chunks'`);
        if (tableExists.rows.length > 0) {
            const dimRes = await client.query(`
        SELECT (regexp_matches(format_type(a.atttypid, a.atttypmod), 'vector\\((\\d+)\\)'))[1]::int as dim
        FROM pg_attribute a JOIN pg_class c ON a.attrelid = c.oid
        WHERE c.relname = 'faq_chunks' AND a.attname = 'embedding' AND a.attnum > 0 AND NOT a.attisdropped
      `);
            const currentDim = dimRes.rows[0]?.dim;
            if (currentDim != null && currentDim !== EMBEDDING_DIM) {
                console.log(`🔄 Recreating faq_chunks (dim ${currentDim} → ${EMBEDDING_DIM})`);
                await client.query(`DROP TABLE IF EXISTS faq_chunks`);
            }
        }
        await client.query(`
      CREATE TABLE IF NOT EXISTS faq_chunks (
        id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        content   TEXT NOT NULL,
        embedding VECTOR(${EMBEDDING_DIM}),
        source    VARCHAR(255)
      )
    `);
        const { rowCount } = await client.query(`DELETE FROM faq_chunks WHERE source = $1`, [sourceLabel]);
        console.log(`🗑️  Cleared ${rowCount ?? 0} old rows for "${sourceLabel}"`);
        console.log(`\n🤖 Generating embeddings...`);
        let inserted = 0;
        const t0 = Date.now();
        for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
            const batch = chunks.slice(i, i + BATCH_SIZE);
            if (USE_GEMINI && i > 0)
                await new Promise((r) => setTimeout(r, 2000));
            const embeddings = await embedBatch(batch);
            for (let j = 0; j < batch.length; j++) {
                const vec = `[${embeddings[j].join(',')}]`;
                await client.query(`INSERT INTO faq_chunks (content, embedding, source) VALUES ($1, $2::vector, $3)`, [batch[j], vec, sourceLabel]);
                inserted++;
            }
            const done = Math.min(i + BATCH_SIZE, chunks.length);
            const pct = Math.round((done / chunks.length) * 100);
            process.stdout.write(`   [${pct}%] ${done}/${chunks.length} chunks\r`);
        }
        const elapsed = Math.round((Date.now() - t0) / 1000);
        console.log(`\n\n✅ Done! Inserted ${inserted} chunks from "${sourceLabel}" (${elapsed}s)`);
    }
    finally {
        client.release();
        await pool.end();
    }
}
main().catch(err => {
    console.error('❌ Indexing failed:', err.message);
    process.exit(1);
});
//# sourceMappingURL=index-pdf.js.map