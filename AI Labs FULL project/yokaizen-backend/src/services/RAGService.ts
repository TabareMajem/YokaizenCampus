import { Repository } from 'typeorm';
import { AppDataSource } from '@config/database';
import { storage } from '@config/storage';
import { logger, aiLogger } from '@config/logger';
import { Agent } from '@entities/Agent';
import { KnowledgeChunk } from '@entities/KnowledgeChunk';
import { ApiError } from '@utils/errors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '@config/env';
import pdf from 'pdf-parse';

interface ProcessingResult {
  chunksCreated: number;
  totalTokens: number;
  processingTime: number;
}

interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  similarity: number;
  sourceUrl?: string;
}

// Embedding dimensions for different models
const EMBEDDING_DIMENSIONS = {
  'text-embedding-004': 768,
  'text-embedding-3-small': 1536,
  'gecko': 768,
};

export class RAGService {
  private agentRepository: Repository<Agent>;
  private chunkRepository: Repository<KnowledgeChunk>;
  private genAI: GoogleGenerativeAI;

  // Chunking configuration
  private readonly CHUNK_SIZE = 1000; // characters
  private readonly CHUNK_OVERLAP = 200; // characters
  private readonly MAX_CHUNKS_PER_QUERY = 5;

  constructor() {
    this.agentRepository = AppDataSource.getRepository(Agent);
    this.chunkRepository = AppDataSource.getRepository(KnowledgeChunk);
    this.genAI = new GoogleGenerativeAI(config.google.apiKey);
  }

  async processDocument(
    agentId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    const agent = await this.agentRepository.findOneBy({ id: agentId });
    if (!agent) throw ApiError.notFound('Agent not found');

    let text: string;

    // Extract text based on file type
    if (mimeType === 'application/pdf') {
      text = await this.extractPdfText(fileBuffer);
    } else if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
      text = fileBuffer.toString('utf-8');
    } else if (mimeType === 'application/json') {
      const jsonData = JSON.parse(fileBuffer.toString('utf-8'));
      text = this.flattenJson(jsonData);
    } else {
      throw ApiError.badRequest(`Unsupported file type: ${mimeType}`);
    }

    // Upload original file to storage
    const uploadResult = await storage.uploadKnowledgeBase(fileBuffer, fileName, agentId);
    const fileUrl = uploadResult.url;

    // Chunk the text
    const chunks = this.chunkText(text);

    // Generate embeddings and store chunks
    let totalTokens = 0;
    const chunkEntities: KnowledgeChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      totalTokens += Math.ceil(chunk.length / 4); // Rough token estimate

      const chunkEntity = this.chunkRepository.create({
        agentId: agent.id,
        content: chunk,
        embedding: JSON.stringify(embedding), // manual handling if needed, but entity says string
        // sourceUrl removed, using metadata
        chunkIndex: i,
        metadata: {
          url: fileUrl,
          fileName,
          customFields: {
            totalChunks: String(chunks.length),
          }
        },
      } as any) as any as KnowledgeChunk;

      chunkEntities.push(chunkEntity);
    }

    // Batch insert
    await this.chunkRepository.save(chunkEntities);

    // Update agent
    agent.hasKnowledgeBase = true;
    agent.knowledgeBaseUrl = fileUrl;
    await this.agentRepository.save(agent);

    const processingTime = Date.now() - startTime;

    aiLogger.info('Document processed for RAG', {
      agentId,
      fileName,
      chunksCreated: chunks.length,
      processingTime,
    });

    return {
      chunksCreated: chunks.length,
      totalTokens,
      processingTime,
    };
  }

  async searchKnowledge(
    agentId: string,
    query: string,
    maxResults: number = this.MAX_CHUNKS_PER_QUERY
  ): Promise<SearchResult[]> {
    const agent = await this.agentRepository.findOneBy({ id: agentId });
    if (!agent || !agent.hasKnowledgeBase) {
      return [];
    }

    // Generate embedding for query
    const queryEmbedding = await this.generateEmbedding(query);

    // Perform vector similarity search using pgvector
    const results = await this.chunkRepository
      .createQueryBuilder('chunk')
      .select([
        'chunk.id',
        'chunk.content',
        'chunk.metadata',
        // 'chunk.sourceUrl', // Removed as column doesn't exist
      ])
      .addSelect(
        `1 - (chunk.embedding <=> :embedding)`,
        'similarity'
      )
      .where('chunk.agentId = :agentId', { agentId })
      .setParameter('embedding', `[${queryEmbedding.join(',')}]`)
      .orderBy('similarity', 'DESC')
      .limit(maxResults)
      .getRawAndEntities();

    return results.raw.map((row, index) => ({
      content: results.entities[index].content,
      metadata: results.entities[index].metadata,
      sourceUrl: results.entities[index].metadata?.url,
      similarity: parseFloat(row.similarity) || 0,
    }));
  }

  async buildContextFromKnowledge(agentId: string, query: string): Promise<string> {
    const results = await this.searchKnowledge(agentId, query);

    if (results.length === 0) {
      return '';
    }

    // Filter by minimum similarity threshold
    const relevantResults = results.filter(r => r.similarity > 0.5);

    if (relevantResults.length === 0) {
      return '';
    }

    // Build context string
    const contextParts = relevantResults.map((r, i) =>
      `[Source ${i + 1}]\n${r.content}`
    );

    return `\n\n--- Relevant Knowledge Base Context ---\n${contextParts.join('\n\n---\n\n')}\n--- End of Context ---\n`;
  }

  async deleteKnowledgeBase(agentId: string): Promise<void> {
    const agent = await this.agentRepository.findOneBy({ id: agentId });
    if (!agent) throw ApiError.notFound('Agent not found');

    // Delete all chunks
    await this.chunkRepository.delete({ agentId });

    // Delete files from storage
    if (agent.knowledgeBaseUrl) {
      try {
        // Note: We can't easily delete by URL as we need the key. 
        // Assuming we might skip explicit file deletion for now or need to parse key.
        // await storage.delete(agent.knowledgeBaseUrl); 
        logger.warn('Skipping file deletion as key is not stored', { url: agent.knowledgeBaseUrl });
      } catch (error) {
        logger.warn('Failed to delete knowledge base files', { error, agentId });
      }
    }

    // Update agent
    agent.hasKnowledgeBase = false;
    agent.knowledgeBaseUrl = null;
    await this.agentRepository.save(agent);

    aiLogger.info('Knowledge base deleted', { agentId });
  }

  async getKnowledgeStats(agentId: string): Promise<{
    totalChunks: number;
    totalTokens: number;
    sources: string[];
  }> {
    const chunks = await this.chunkRepository.find({
      where: { agentId },
      select: ['content', 'metadata'],
    });

    const sources = [...new Set(chunks.map(c => c.metadata?.url).filter(Boolean))] as string[];
    const totalTokens = chunks.reduce((sum, c) => sum + Math.ceil(c.content.length / 4), 0);

    return {
      totalChunks: chunks.length,
      totalTokens,
      sources,
    };
  }

  async addTextToKnowledge(
    agentId: string,
    text: string,
    source: string = 'manual_entry'
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    const agent = await this.agentRepository.findOneBy({ id: agentId });
    if (!agent) throw ApiError.notFound('Agent not found');

    const chunks = this.chunkText(text);
    let totalTokens = 0;
    const chunkEntities: KnowledgeChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await this.generateEmbedding(chunk);
      totalTokens += Math.ceil(chunk.length / 4);

      const chunkEntity = this.chunkRepository.create({
        agentId: agent.id,
        content: chunk,
        embedding: JSON.stringify(embedding),
        chunkIndex: i,
        metadata: {
          source, // passed arg
          customFields: {
            totalChunks: String(chunks.length),
            addedAt: new Date().toISOString(),
          }
        },
      });

      chunkEntities.push(chunkEntity);
    }

    await this.chunkRepository.save(chunkEntities);

    agent.hasKnowledgeBase = true;
    await this.agentRepository.save(agent);

    return {
      chunksCreated: chunks.length,
      totalTokens,
      processingTime: Date.now() - startTime,
    };
  }

  private async extractPdfText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error) {
      logger.error('PDF extraction failed', { error });
      throw ApiError.badRequest('Failed to extract text from PDF');
    }
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    let start = 0;

    // Clean and normalize text
    const cleanText = text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    while (start < cleanText.length) {
      let end = start + this.CHUNK_SIZE;

      // Try to break at sentence boundary
      if (end < cleanText.length) {
        const searchStart = Math.max(start + this.CHUNK_SIZE - 100, start);
        const searchText = cleanText.slice(searchStart, end + 50);

        // Look for sentence endings
        const sentenceEnd = searchText.search(/[.!?]\s/);
        if (sentenceEnd !== -1) {
          end = searchStart + sentenceEnd + 1;
        }
      }

      const chunk = cleanText.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start = end - this.CHUNK_OVERLAP;
    }

    return chunks;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      // Use Google's text embedding model
      const model = this.genAI.getGenerativeModel({ model: 'text-embedding-004' });

      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      aiLogger.error(new Error('Embedding generation failed'), { error: String(error) });

      // Return zero vector as fallback (not ideal but prevents crashes)
      return new Array(768).fill(0);
    }
  }

  private flattenJson(obj: any, prefix: string = ''): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        lines.push(this.flattenJson(value, fullKey));
      } else if (Array.isArray(value)) {
        lines.push(`${fullKey}: ${value.join(', ')}`);
      } else {
        lines.push(`${fullKey}: ${value}`);
      }
    }

    return lines.join('\n');
  }
}

export const ragService = new RAGService();
