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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const pdfParse = require('pdf-parse');
const CHUNK_SIZE_CHARS = 600;
const CHUNK_OVERLAP_CHARS = 100;
function splitTextIntoChunks(text) {
    const chunks = [];
    const normalized = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    const paragraphs = normalized.split(/\n\n+/);
    let current = '';
    for (const para of paragraphs) {
        if ((current + '\n\n' + para).length <= CHUNK_SIZE_CHARS) {
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
    return chunks.filter(c => c.length > 20);
}
async function main() {
    const pdfPath = path.resolve(__dirname, '../../knowledge-base.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ File not found:', pdfPath);
        process.exit(1);
    }
    console.log('📄 Parsing PDF...');
    const dataBuffer = fs.readFileSync(pdfPath);
    const { text, numpages } = await pdfParse(dataBuffer);
    console.log(`\n📊 PDF Stats:`);
    console.log(`   Pages          : ${numpages}`);
    console.log(`   Total chars    : ${text.length.toLocaleString()}`);
    console.log(`   Total words    : ${text.split(/\s+/).length.toLocaleString()}`);
    const chunks = splitTextIntoChunks(text);
    console.log(`\n✂️  Chunking Results:`);
    console.log(`   Chunk size     : ${CHUNK_SIZE_CHARS} chars`);
    console.log(`   Overlap        : ${CHUNK_OVERLAP_CHARS} chars`);
    console.log(`   Total chunks   : ${chunks.length}`);
    console.log(`   Est. API cost  : ~$${(chunks.length * 0.0000002).toFixed(4)} USD (text-embedding-3-small)`);
    console.log(`   Est. API time  : ~${Math.ceil(chunks.length / 20 * 2)} seconds`);
    console.log(`\n📝 Sample chunks:`);
    [0, 1, 2, Math.floor(chunks.length / 2)].forEach((i) => {
        if (chunks[i]) {
            console.log(`\n── Chunk #${i + 1} ──────────────────────────────────`);
            console.log(chunks[i].substring(0, 300));
            console.log(`   [${chunks[i].length} chars]`);
        }
    });
}
main().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});
//# sourceMappingURL=dry-run-parse.js.map