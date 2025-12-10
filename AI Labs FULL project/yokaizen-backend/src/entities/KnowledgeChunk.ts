import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum ChunkSource {
  PDF = 'PDF',
  TEXT = 'TEXT',
  URL = 'URL',
  MANUAL = 'MANUAL',
}

@Entity('knowledge_chunks')
export class KnowledgeChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'agent_id' })
  @Index('idx_knowledge_chunks_agent_id')
  agentId: string;

  @Column({ type: 'uuid', name: 'source_file_id', nullable: true })
  sourceFileId: string;

  @Column({ nullable: true, name: 'source_file_name' })
  sourceFileName: string;

  @Column({
    type: 'enum',
    enum: ChunkSource,
    default: ChunkSource.PDF,
  })
  source: ChunkSource;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', default: 0, name: 'chunk_index' })
  chunkIndex: number;

  @Column({ type: 'int', default: 0, name: 'start_char' })
  startChar: number;

  @Column({ type: 'int', default: 0, name: 'end_char' })
  endChar: number;

  @Column({ type: 'int', nullable: true, name: 'page_number' })
  pageNumber: number;

  @Column({ nullable: true, name: 'section_title' })
  sectionTitle: string;

  // pgvector embedding column
  // Note: This requires the pgvector extension and proper column type
  // In TypeORM, we store as string and handle conversion manually
  @Column({ type: 'text', name: 'embedding', nullable: true })
  embedding: string; // Store as JSON string, convert to/from float[]

  @Column({ type: 'int', default: 768, name: 'embedding_dimension' })
  embeddingDimension: number;

  @Column({ nullable: true, name: 'embedding_model' })
  embeddingModel: string; // 'text-embedding-gecko-003', 'text-embedding-ada-002'

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    title?: string;
    author?: string;
    url?: string;
    language?: string;
    keywords?: string[];
    customFields?: Record<string, string>;
  };

  @Column({ type: 'int', default: 0, name: 'token_count' })
  tokenCount: number;

  @Column({ type: 'int', default: 0, name: 'retrieval_count' })
  retrievalCount: number;

  @Column({ type: 'float', default: 0, name: 'avg_relevance_score' })
  avgRelevanceScore: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Convert embedding string to float array
  getEmbeddingVector(): number[] {
    if (!this.embedding) return [];
    try {
      return JSON.parse(this.embedding);
    } catch {
      return [];
    }
  }

  // Set embedding from float array
  setEmbeddingVector(vector: number[]): void {
    this.embedding = JSON.stringify(vector);
    this.embeddingDimension = vector.length;
  }

  // Calculate cosine similarity with another vector
  cosineSimilarity(otherVector: number[]): number {
    const thisVector = this.getEmbeddingVector();
    if (thisVector.length !== otherVector.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < thisVector.length; i++) {
      dotProduct += thisVector[i] * otherVector[i];
      normA += thisVector[i] * thisVector[i];
      normB += otherVector[i] * otherVector[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  // Get preview of content
  getPreview(maxLength = 200): string {
    if (this.content.length <= maxLength) return this.content;
    return this.content.substring(0, maxLength) + '...';
  }
}

// Helper type for vector search results
export interface KnowledgeSearchResult {
  chunk: KnowledgeChunk;
  score: number;
  rank: number;
}

export default KnowledgeChunk;
