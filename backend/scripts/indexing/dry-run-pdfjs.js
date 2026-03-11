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
async function main() {
    const pdfPath = path.resolve(__dirname, '../../knowledge-base.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error('❌ File not found:', pdfPath);
        process.exit(1);
    }
    console.log('📄 Loading PDF with pdfjs-dist...');
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data, useSystemFonts: true });
    const pdf = await loadingTask.promise;
    console.log(`\n📊 PDF Stats:`);
    console.log(`   Pages: ${pdf.numPages}`);
    let fullText = '';
    let pageErrors = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
        try {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => item.str)
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            if (pageText.length > 0) {
                fullText += pageText + '\n\n';
            }
        }
        catch {
            pageErrors++;
        }
        if (i % 50 === 0)
            process.stdout.write(`   Processed ${i}/${pdf.numPages} pages...\r`);
    }
    console.log(`\n   Total chars extracted: ${fullText.length.toLocaleString()}`);
    console.log(`   Total words estimate: ${fullText.split(/\s+/).length.toLocaleString()}`);
    console.log(`   Page errors: ${pageErrors}`);
    if (fullText.length > 100) {
        console.log('\n📝 Sample text (first 500 chars):');
        console.log(fullText.substring(0, 500));
        console.log('\n...(middle sample)...');
        const mid = Math.floor(fullText.length / 2);
        console.log(fullText.substring(mid, mid + 300));
        const outPath = path.resolve(__dirname, '../../extracted-text.txt');
        fs.writeFileSync(outPath, fullText, 'utf-8');
        console.log(`\n✅ Full text saved to: extracted-text.txt`);
        console.log('   Run: indexing pipeline will use this text');
    }
    else {
        console.log('\n⚠️  Very little text extracted — PDF may use custom encoding');
        console.log('   Consider "Save As" the PDF in Acrobat or Chrome to re-encode it');
    }
}
main().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});
//# sourceMappingURL=dry-run-pdfjs.js.map