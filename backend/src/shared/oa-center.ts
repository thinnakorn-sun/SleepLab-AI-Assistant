/**
 * แปลง lineOaId (ค่าจาก LINE_OA_ID / LINE_OA_ID_* ใน env) เป็น center key ภายในระบบ
 * center key: sleepverse | wuh | pnk | bangpli | thamc | unknown
 */
export type CenterKey = 'sleepverse' | 'wuh' | 'pnk' | 'bangpli' | 'thamc' | 'unknown';

export function resolveCenterKeyFromLineOaId(lineOaId: string | undefined | null): CenterKey {
    const v = (lineOaId ?? '').trim();
    if (!v) return 'unknown';

    const env = process.env as Record<string, string | undefined>;
    const matches = (candidate: string | undefined) => (candidate ?? '').trim() !== '' && v === (candidate ?? '').trim();

    if (matches(env.LINE_OA_ID_SLEEPVERSE_TROPMED) || matches(env.LINE_DESTINATION_SLEEPVERSE_TROPMED)) {
        return 'sleepverse';
    }
    if (matches(env.LINE_OA_ID_WUH_SLEEP_CENTER) || matches(env.LINE_DESTINATION_WUH_SLEEP_CENTER)) {
        return 'wuh';
    }
    if (matches(env.LINE_OA_ID_THAMC_SLEEP_CENTER) || matches(env.LINE_DESTINATION_THAMC_SLEEP_CENTER)) {
        return 'thamc';
    }
    if (matches(env.LINE_OA_ID_BPH_SLEEP_LAB) || matches(env.LINE_DESTINATION_BANGPLI_SLEEP_CENTER)) {
        return 'bangpli';
    }
    // backward compatibility: old destination key name for Bangpli
    if (matches(env.LINE_DESTINATION_BPH_SLEEP_LAB)) {
        return 'bangpli';
    }
    if (
        matches(env.LINE_OA_ID_PNK_SLEEP_CENTER) ||
        matches(env.LINE_DESTINATION_PNK_SLEEP_CENTER) ||
        matches(env.LINE_OA_ID) ||
        v === 'default'
    ) {
        return 'pnk';
    }

    return 'unknown';
}

/**
 * ข้อความหัวการ์ดต้อนรับ (บรรทัดเดียว ไม่รวม 🌙 — flex template จะต่อให้)
 * แมปจาก LINE_OA_ID_* / LINE_DESTINATION_* ตาม env ของแต่ละศูนย์
 */
export function resolveGreetingHeaderLine(lineOaId: string | undefined | null): string | null {
    const v = (lineOaId ?? '').trim();
    if (!v) return null;

    const env = process.env as Record<string, string | undefined>;
    const matches = (candidate: string | undefined) => (candidate ?? '').trim() !== '' && v === (candidate ?? '').trim();

    if (matches(env.LINE_OA_ID_SLEEPVERSE_TROPMED) || matches(env.LINE_DESTINATION_SLEEPVERSE_TROPMED)) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ SleepVerse @Tropmed';
    }
    if (matches(env.LINE_OA_ID_WUH_SLEEP_CENTER) || matches(env.LINE_DESTINATION_WUH_SLEEP_CENTER)) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ WUH Sleep Center';
    }
    if (matches(env.LINE_OA_ID_THAMC_SLEEP_CENTER) || matches(env.LINE_DESTINATION_THAMC_SLEEP_CENTER)) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ THAMC Sleep Center';
    }
    if (matches(env.LINE_OA_ID_BPH_SLEEP_LAB) || matches(env.LINE_DESTINATION_BANGPLI_SLEEP_CENTER)) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ BPH Sleep Center';
    }
    // backward compatibility: old destination key name for Bangpli
    if (matches(env.LINE_DESTINATION_BPH_SLEEP_LAB)) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ BPH Sleep Center';
    }
    if (
        matches(env.LINE_OA_ID_PNK_SLEEP_CENTER) ||
        matches(env.LINE_DESTINATION_PNK_SLEEP_CENTER) ||
        matches(env.LINE_OA_ID) ||
        v === 'default'
    ) {
        return 'สวัสดีค่ะ ยินดีต้อนรับสู่ PNK Sleep Center';
    }

    return null;
}
