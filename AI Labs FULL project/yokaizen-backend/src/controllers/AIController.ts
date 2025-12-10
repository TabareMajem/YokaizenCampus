import { Response } from 'express';
import { aiService } from '@services/AIService';
import { ragService } from '@services/RAGService';
import { asyncHandler, successResponse } from '@utils/errors';
import { AuthenticatedRequest } from '@/types';
import { AppDataSource } from '@config/database';
import { Agent } from '@entities/Agent';

export class AIController {
  private agentRepository = AppDataSource.getRepository(Agent);

  /**
   * POST /ai/chat
   * Chat with an AI agent
   */
  chat = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { agentId, history, message, stream } = req.body;

    if (stream) {
      // Set up SSE for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const generator = await aiService.chat(
        req.user!.userId,
        agentId,
        history || [],
        message,
        true
      ) as AsyncGenerator<string>;

      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const result = await aiService.chat(
        req.user!.userId,
        agentId,
        history || [],
        message,
        false
      );

      res.json(successResponse(result));
    }
  });

  /**
   * POST /ai/generate-image
   * Generate an image from a prompt
   */
  generateImage = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { prompt, style, size } = req.body;

    const result = await aiService.generateImage(
      req.user!.userId,
      prompt
    );

    res.json(successResponse(result));
  });

  /**
   * POST /ai/generate-game
   * Generate a complete game from a topic
   */
  generateGame = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { topic, difficulty } = req.body;

    const game = await aiService.generateGame(
      req.user!.userId,
      topic,
      difficulty
    );

    res.json(successResponse(game));
  });

  /**
   * POST /ai/vision-analyze
   * Analyze an image using vision AI
   */
  analyzeVision = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { imageBase64, prompt } = req.body;

    const result = await aiService.analyzeVision(
      req.user!.userId,
      imageBase64,
      prompt
    );

    res.json(successResponse(result));
  });

  /**
   * POST /ai/voice-synth
   * Synthesize speech from text
   */
  synthesizeVoice = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { text, voiceId } = req.body;

    const audioBuffer = await aiService.synthesizeVoice(
      req.user!.userId,
      text,
      voiceId
    );

    res.setHeader('Content-Type', 'audio/mp3');
    res.send(audioBuffer);
  });

  /**
   * POST /ai/live-token
   * Get a token for direct Gemini Live API access
   */
  getLiveToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await aiService.generateLiveToken(req.user!.userId);
    res.json(successResponse(result));
  });

  // =========== Agent Management ===========

  /**
   * GET /ai/agents
   * Get public agents or user's own
   */
  listAgents = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      page = '1', 
      limit = '20',
      search,
      category,
      myAgents 
    } = req.query;

    const query = this.agentRepository.createQueryBuilder('agent')
      .leftJoinAndSelect('agent.creator', 'creator')
      .select([
        'agent.id',
        'agent.name',
        'agent.persona',
        'agent.avatarUrl',
        'agent.isPublic',
        'agent.totalChats',
        'agent.averageRating',
        'agent.createdAt',
        'creator.id',
        'creator.username',
      ]);

    if (myAgents === 'true') {
      query.where('agent.creatorId = :userId', { userId: req.user!.userId });
    } else {
      query.where('(agent.isPublic = true OR agent.creatorId = :userId)', { 
        userId: req.user?.userId 
      });
    }

    if (search) {
      query.andWhere('(agent.name ILIKE :search OR agent.persona ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    if (category) {
      query.andWhere('agent.category = :category', { category });
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const [agents, total] = await query
      .orderBy('agent.totalChats', 'DESC')
      .skip((pageNum - 1) * limitNum)
      .take(limitNum)
      .getManyAndCount();

    res.json(successResponse({
      agents,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    }));
  });

  /**
   * GET /ai/agents/:id
   * Get specific agent details
   */
  getAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const agent = await this.agentRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found' } });
      return;
    }

    // Check access
    if (!agent.isPublic && agent.creator.id !== req.user?.userId) {
      res.status(403).json({ success: false, error: { message: 'Access denied' } });
      return;
    }

    res.json(successResponse(agent));
  });

  /**
   * POST /ai/agents
   * Create a new AI agent
   */
  createAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      name, 
      persona, 
      systemInstruction, 
      modelPreference,
      avatarUrl,
      isPublic,
      category 
    } = req.body;

    const agent = this.agentRepository.create({
      name,
      persona,
      systemInstruction,
      modelPreference,
      avatarUrl,
      isPublic: isPublic ?? false,
      category,
      creator: { id: req.user!.userId },
    });

    await this.agentRepository.save(agent);

    res.json(successResponse(agent));
  });

  /**
   * PUT /ai/agents/:id
   * Update an agent
   */
  updateAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const agent = await this.agentRepository.findOne({
      where: { id, creator: { id: req.user!.userId } },
    });

    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found or access denied' } });
      return;
    }

    Object.assign(agent, updates);
    await this.agentRepository.save(agent);

    res.json(successResponse(agent));
  });

  /**
   * DELETE /ai/agents/:id
   * Delete an agent
   */
  deleteAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const result = await this.agentRepository.delete({
      id,
      creator: { id: req.user!.userId },
    });

    if (result.affected === 0) {
      res.status(404).json({ success: false, error: { message: 'Agent not found or access denied' } });
      return;
    }

    // Also delete knowledge base if exists
    await ragService.deleteKnowledgeBase(id);

    res.json(successResponse({ message: 'Agent deleted' }));
  });

  // =========== Knowledge Base (RAG) ===========

  /**
   * POST /ai/agents/:id/knowledge
   * Upload document to agent's knowledge base
   */
  uploadKnowledge = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: { message: 'File required' } });
      return;
    }

    // Verify agent ownership
    const agent = await this.agentRepository.findOne({
      where: { id, creator: { id: req.user!.userId } },
    });

    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found or access denied' } });
      return;
    }

    const result = await ragService.processDocument(
      id,
      file.buffer,
      file.originalname,
      file.mimetype
    );

    res.json(successResponse(result));
  });

  /**
   * POST /ai/agents/:id/knowledge/text
   * Add text directly to knowledge base
   */
  addKnowledgeText = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { text, source } = req.body;

    // Verify agent ownership
    const agent = await this.agentRepository.findOne({
      where: { id, creator: { id: req.user!.userId } },
    });

    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found or access denied' } });
      return;
    }

    const result = await ragService.addTextToKnowledge(id, text, source);
    res.json(successResponse(result));
  });

  /**
   * GET /ai/agents/:id/knowledge/stats
   * Get knowledge base statistics
   */
  getKnowledgeStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const stats = await ragService.getKnowledgeStats(id);
    res.json(successResponse(stats));
  });

  /**
   * DELETE /ai/agents/:id/knowledge
   * Clear agent's knowledge base
   */
  deleteKnowledge = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    // Verify agent ownership
    const agent = await this.agentRepository.findOne({
      where: { id, creator: { id: req.user!.userId } },
    });

    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found or access denied' } });
      return;
    }

    await ragService.deleteKnowledgeBase(id);
    res.json(successResponse({ message: 'Knowledge base cleared' }));
  });

  /**
   * POST /ai/agents/:id/rate
   * Rate an agent
   */
  rateAgent = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { rating } = req.body;

    const agent = await this.agentRepository.findOneBy({ id });
    if (!agent) {
      res.status(404).json({ success: false, error: { message: 'Agent not found' } });
      return;
    }

    // Update average rating (simplified - would need proper rating tracking)
    const currentTotal = agent.averageRating * agent.totalChats;
    agent.averageRating = (currentTotal + rating) / (agent.totalChats + 1);
    await this.agentRepository.save(agent);

    res.json(successResponse({ message: 'Rating submitted' }));
  });
}

export const aiController = new AIController();
