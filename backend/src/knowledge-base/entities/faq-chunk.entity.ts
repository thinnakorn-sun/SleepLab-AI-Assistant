import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('faq_chunks')
export class FaqChunk {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    content: string;

    // Uses pgvector. Dimension: 768 (Gemini) or 1536 (OpenAI). Must match index script & VectorSearchService.
    @Column({ type: 'vector', length: 768, nullable: true })
    embedding: number[];

    @Column({ type: 'varchar', length: 255, nullable: true })
    source: string;
}
