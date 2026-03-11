export interface FlexReply {
    flex: {
        altText: string;
        contents: object;
    };
}
export declare function createGreetingFlex(centerName: string, options?: {
    botName?: string;
}): FlexReply;
export declare function createScreeningResultFlex(isHighRisk: boolean, message: string, contactMenuKey?: string, options?: {
    sleepHygieneArticleUrl?: string;
}): FlexReply;
export declare function createFAQFlex(text: string, altText?: string): FlexReply;
export declare function createContactFlex(options?: {
    businessHours?: string;
    botName?: string;
}): FlexReply;
