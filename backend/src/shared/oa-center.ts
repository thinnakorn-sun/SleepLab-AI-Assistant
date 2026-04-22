/**
 * แปลง lineOaId (ค่าจาก LINE_OA_ID / LINE_OA_ID_* ใน env) เป็น center key ภายในระบบ
 * center key: sleepverse | wuh | pnk | bph | unknown
 */
export type CenterKey = 'sleepverse' | 'wuh' | 'pnk' | 'bph' | 'unknown';

export function resolveCenterKeyFromLineOaId(lineOaId: string | undefined | null): CenterKey {
    const v = (lineOaId ?? '').trim();
    if (!v) return 'unknown';

    const env = process.env as Record<string, string | undefined>;

    if (v === (env.LINE_OA_ID ?? '').trim() || v === 'default') {
        return 'pnk';
    }
    if (v === (env.LINE_OA_ID_SLEEPVERSE_TROPMED ?? '').trim()) {
        return 'sleepverse';
    }
    if (v === (env.LINE_OA_ID_WUH_SLEEP_CENTER ?? '').trim()) {
        return 'wuh';
    }
    if (v === (env.LINE_OA_ID_BPH_SLEEP_LAB ?? '').trim()) {
        return 'bph';
    }

    return 'unknown';
}
