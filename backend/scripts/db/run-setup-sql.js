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
const dotenv = __importStar(require("dotenv"));
const pg_1 = require("pg");
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
async function main() {
    const sqlPath = path.resolve(__dirname, 'setup.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL is not set in .env');
        process.exit(1);
    }
    const client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    console.log('🔌 Connecting to Neon...');
    await client.connect();
    console.log('   Connected ✅\n');
    console.log('🚀 Running setup.sql...\n');
    const rawStatements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 5);
    for (const stmt of rawStatements) {
        const preview = stmt.replace(/\s+/g, ' ').substring(0, 70);
        try {
            const result = await client.query(stmt);
            const tag = result.command ?? 'OK';
            console.log(`  ✅ ${tag}  — ${preview}`);
            if (result.rows?.length) {
                for (const row of result.rows) {
                    console.log('     📋', JSON.stringify(row));
                }
            }
        }
        catch (err) {
            console.log(`  ⚠️  ${preview.substring(0, 60)}`);
            console.log(`     → ${err.message}`);
        }
    }
    await client.end();
    console.log('\n✅ Database setup complete!');
}
main().catch(err => {
    console.error('Fatal:', err.message);
    process.exit(1);
});
//# sourceMappingURL=run-setup-sql.js.map