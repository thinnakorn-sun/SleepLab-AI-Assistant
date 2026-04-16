# SleepLab AI Chatbot — Backend

NestJS + PostgreSQL (pgvector via Neon) + OpenAI RAG Chatbot for LINE OA

---

## 📁 Folder Structure

```
backend/
├── src/
│   ├── app.module.ts              # Root module (TypeORM, ConfigModule)
│   ├── main.ts
│   ├── config/                    # Config loaders from .env
│   │   ├── database.config.ts
│   │   ├── line.config.ts
│   │   └── openai.config.ts
│   ├── shared/types/index.ts      # Core interfaces + enums
│   │
│   ├── modules/
│   │   ├── line/                  # Webhook controller + LINE SDK client
│   │   └── chatbot/               # Router, Handlers, Services, Entities
│   │       ├── handlers/          # Greeting, Screening, FAQ, Contact
│   │       ├── router/            # MessageRouter (OOP state machine)
│   │       ├── services/          # ConversationService, FAQService, ScreeningService
│   │       └── entities/          # User, Conversation (TypeORM)
│   │
│   ├── ai/                        # AIService (OpenAI) + PromptBuilder
│   ├── rag/                       # VectorSearchService (pgvector) + ChunkingService
│   └── knowledge-base/            # FAQRepository + KnowledgeBaseService + FaqChunk entity
│
├── scripts/
│   ├── db/setup.sql               # ⬅ Run once on Neon SQL Editor
│   └── indexing/index-pdf.ts      # ⬅ Run once to index the PDF knowledge base
│
├── knowledge-base.pdf             # Source PDF from customer
├── .env.example                   # Copy → .env and fill in values
└── package.json
```

---

## 🚀 Getting Started

### 1. Create a Neon PostgreSQL database

1. Go to [https://console.neon.tech](https://console.neon.tech) and sign up (free tier available)
2. Click **New Project** → give it a name (e.g. `sleeplab-chatbot`)
3. Choose a region closest to your server
4. After creation, go to **Connection Details** → copy the **Connection string**
   - It looks like: `postgresql://USER:PASS@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`

### 2. Setup the database schema

Open the **SQL Editor** tab in Neon console, paste and run the content of:

```
scripts/db/setup.sql
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and fill in:

- `DATABASE_URL` — from Neon connection details
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com/api-keys)
- `LINE_CHANNEL_ACCESS_TOKEN` + `LINE_CHANNEL_SECRET` — from LINE Developers Console

### 4. Index the knowledge base PDF

After filling `.env`, run the one-time PDF indexing pipeline:

```bash
npx ts-node --project tsconfig.json scripts/indexing/index-pdf.ts --file knowledge-base.pdf
```

This will:

- Parse the PDF
- Split text into overlapping chunks
- Call OpenAI embeddings API
- Store chunks in the `faq_chunks` table in Neon

### 5. Start the server

```bash
npm run start:dev
```

The webhook endpoint will be available at:

```
POST http://localhost:3000/webhook
```

Health check endpoints:

```
GET http://localhost:3000/health
GET http://localhost:3000/
```

## ☁️ Render Deployment (6 OA, single service)

Use the full production checklist here:

`docs/RENDER_DEPLOYMENT_6_OA.md`

---

## 🔄 Message Flow

```
LINE User
  └─► LINE API (Webhook POST /webhook)
        └─► LineWebhookController
              └─► LineService.handleEvent()
                    ├─ ConversationService.getContext()       ← reads DB state
                    └─► MessageRouter.route()
                          ├─ ScreeningHandler → ScreeningService  (step-by-step questions)
                          ├─ FAQHandler       → FAQService        → VectorSearchService (pgvector)
                          │                                       → AIService (OpenAI generate)
                          ├─ ContactHandler   → reply staff message
                          └─ GreetingHandler  → welcome message
                    └─ ConversationService.saveMessage()      ← saves to DB
                    └─ LineClient.replyMessage()              ← replies via LINE API
```

---

## 🌐 Supporting 6 LINE OA

Every incoming webhook carries a `channelId` (identified from the `x-line-channel-id` header or LINE channel config).

The `line_oa_id` field is stored in:

- `users` table — per-user state is scoped to the OA
- `faq_chunks` — can be filtered by `line_oa_id` field (add when needed)

---

## 🔧 Tech Stack

| Component    | Technology                      |
| ------------ | ------------------------------- |
| Framework    | NestJS (TypeScript)             |
| Database     | PostgreSQL on Neon              |
| Vector Store | pgvector (HNSW index)           |
| AI / LLM     | OpenAI `gpt-4o-mini`            |
| Embeddings   | OpenAI `text-embedding-3-small` |
| LINE SDK     | `@line/bot-sdk`                 |
| ORM          | TypeORM                         |
