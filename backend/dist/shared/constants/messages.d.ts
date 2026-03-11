export declare function getFaqMessages(contactKey: string): {
    NO_API: string;
    QUOTA: string;
    NO_DATA: string;
};
export declare const MENU_QUERY_EXPANSION: Record<string, string>;
export declare function getScreeningMessages(botName: string): {
    q1: string;
    q2: string;
    q3: string;
    highRisk: string;
    lowRisk: string;
};
export declare function getHandlerFallbacks(botName: string, contactKey: string): {
    SLEEP_LAB: string;
    CPAP: string;
    ELDERLY: string;
};
