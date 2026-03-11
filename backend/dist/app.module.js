"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const line_module_1 = require("./modules/line/line.module");
const chatbot_module_1 = require("./modules/chatbot/chatbot.module");
const ai_module_1 = require("./ai/ai.module");
const rag_module_1 = require("./rag/rag.module");
const knowledge_base_module_1 = require("./knowledge-base/knowledge-base.module");
const line_config_1 = require("./config/line.config");
const openai_config_1 = require("./config/openai.config");
const gemini_config_1 = require("./config/gemini.config");
const database_config_1 = require("./config/database.config");
const chatbot_config_1 = require("./config/chatbot.config");
const user_entity_1 = require("./modules/chatbot/entities/user.entity");
const conversation_entity_1 = require("./modules/chatbot/entities/conversation.entity");
const oa_settings_entity_1 = require("./modules/chatbot/entities/oa-settings.entity");
const faq_chunk_entity_1 = require("./knowledge-base/entities/faq-chunk.entity");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [line_config_1.lineConfig, openai_config_1.openaiConfig, gemini_config_1.geminiConfig, database_config_1.databaseConfig, chatbot_config_1.chatbotConfig],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (configService) => {
                    const dbUrl = configService.get('database.url');
                    return {
                        type: 'postgres',
                        ...(dbUrl
                            ? { url: dbUrl }
                            : {
                                host: configService.get('database.host'),
                                port: configService.get('database.port'),
                                username: configService.get('database.username'),
                                password: configService.get('database.password'),
                                database: configService.get('database.database'),
                            }),
                        ssl: dbUrl ? { rejectUnauthorized: true } : false,
                        entities: [user_entity_1.User, conversation_entity_1.Conversation, oa_settings_entity_1.OASettings, faq_chunk_entity_1.FaqChunk],
                        synchronize: process.env.NODE_ENV !== 'production',
                        extra: { max: 2 },
                    };
                },
            }),
            line_module_1.LineModule,
            chatbot_module_1.ChatbotModule,
            ai_module_1.AIModule,
            rag_module_1.RAGModule,
            knowledge_base_module_1.KnowledgeBaseModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map