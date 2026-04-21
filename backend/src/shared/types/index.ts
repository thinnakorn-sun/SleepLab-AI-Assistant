export enum ConversationState {
    START = 'START',
    // Screening States
    SCREENING_Q1 = 'SCREENING_Q1',
    SCREENING_Q2 = 'SCREENING_Q2',
    SCREENING_Q3 = 'SCREENING_Q3',
    SCREENING_DONE = 'SCREENING_DONE',
    // Menu Flow States
    FAQ = 'FAQ',
    SLEEP_LAB = 'SLEEP_LAB',
    CPAP = 'CPAP',
    ELDERLY = 'ELDERLY',
    CONTACT_STAFF = 'CONTACT_STAFF',
}

export interface UserContext {
    userId: string;
    lineUserId: string;      // raw LINE user ID (U...)
    lineOaId: string;        // which of the 6 LINE OAs
    state: ConversationState;
    screeningStep?: string;
    screeningScore?: number; // count of "ใช่" in screening
    lastMessage?: string;
}

export interface SearchContext {
    content: string;
    source: string;
    /** ระยะทางจาก query (L2) — ยิ่งน้อยยิ่งใกล้เคียง (0 = เหมือนกัน) */
    distance?: number;
}

/** ข้อความ Flex ภายในระบบ */
export type FlexReplyContent = { flex: { altText: string; contents: object } };

/** คำตอบที่ส่งกลับไป LINE — รองรับ text, flex และชุดข้อความหลายอัน */
export type ReplyContent = string | FlexReplyContent | Array<string | FlexReplyContent> | null;

// Loaded per LINE OA from env / settings table
export interface OAConfig {
    lineOaId: string;
    centerName: string;       // e.g. "SMD Sappaya"
    channelAccessToken: string;
    channelSecret: string;
}
