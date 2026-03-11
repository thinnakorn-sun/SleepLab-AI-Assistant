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
async function main() {
    const client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: true },
    });
    await client.connect();
    console.log('🔌 Connected to database\n');
    const r1 = await client.query(`
        DELETE FROM oa_settings
        WHERE channel_access_token LIKE 'TOKEN_REPLACE_%'
           OR channel_access_token = ''
           OR channel_secret LIKE 'SECRET_REPLACE_%'
    `);
    console.log(`  ✅ Deleted ${r1.rowCount ?? 0} placeholder rows from oa_settings`);
    await client.query('TRUNCATE TABLE faq_chunks');
    console.log('  ✅ Truncated faq_chunks');
    await client.end();
    console.log('\n✅ Test data cleared!');
}
main().catch(err => {
    console.error('❌', err.message);
    process.exit(1);
});
//# sourceMappingURL=clear-test-data.js.map