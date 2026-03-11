import { ConfigService } from '@nestjs/config';
import { VectorSearchService } from '../../../rag/vector.service';
import { AIService } from '../../../ai/ai.service';
import { UserContext } from '../../../shared/types';
export declare class FAQService {
    private readonly vectorSearch;
    private readonly ai;
    private readonly configService;
    private readonly logger;
    constructor(vectorSearch: VectorSearchService, ai: AIService, configService: ConfigService);
    answer(question: string, context: UserContext): Promise<string>;
}
