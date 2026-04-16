import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LineModule } from "./modules/line/line.module";
import { ChatbotModule } from "./modules/chatbot/chatbot.module";
import { AIModule } from "./ai/ai.module";
import { RAGModule } from "./rag/rag.module";
import { KnowledgeBaseModule } from "./knowledge-base/knowledge-base.module";

import { lineConfig } from "./config/line.config";
import { openaiConfig } from "./config/openai.config";
import { geminiConfig } from "./config/gemini.config";
import { databaseConfig } from "./config/database.config";
import { chatbotConfig, googleSheetsConfig } from "./config/chatbot.config";
import { User } from "./modules/chatbot/entities/user.entity";
import { Conversation } from "./modules/chatbot/entities/conversation.entity";
import { OASettings } from "./modules/chatbot/entities/oa-settings.entity";
import { FaqChunk } from "./knowledge-base/entities/faq-chunk.entity";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        lineConfig,
        openaiConfig,
        geminiConfig,
        databaseConfig,
        chatbotConfig,
        googleSheetsConfig,
      ],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>("database.url");
        return {
          type: "postgres",
          ...(dbUrl
            ? { url: dbUrl }
            : {
                host: configService.get<string>("database.host"),
                port: configService.get<number>("database.port"),
                username: configService.get<string>("database.username"),
                password: configService.get<string>("database.password"),
                database: configService.get<string>("database.database"),
              }),
          ssl: dbUrl ? { rejectUnauthorized: true } : false,
          entities: [User, Conversation, OASettings, FaqChunk],
          synchronize: process.env.NODE_ENV !== "production",
          extra: { max: 2 }, // ลด concurrent queries เพื่อหลีกเลี่ยง pg DeprecationWarning
        };
      },
    }),
    LineModule,
    ChatbotModule,
    AIModule,
    RAGModule,
    KnowledgeBaseModule,
  ],
})
export class AppModule {}
