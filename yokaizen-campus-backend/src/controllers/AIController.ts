import { Request, Response } from 'express';
import { z } from 'zod';
import { aiEngine } from '../services/AiEngine';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';
import { AgentType, PhilosophyMode } from '../types';

// Validation schemas
const commandSchema = z.object({
  command: z.string().min(3, 'Command must be at least 3 characters'),
  philosophy: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  context: z.string().optional(),
  constraints: z.object({
    maxNodes: z.number().int().min(1).max(50).optional(),
    requiredAgents: z.array(z.string()).optional(),
    excludeAgents: z.array(z.string()).optional(),
    complexity: z.enum(['simple', 'moderate', 'complex']).optional()
  }).optional()
});

const simulateSchema = z.object({
  nodeType: z.enum([
    'SCOUT', 'ARCHITECT', 'CRITIC', 'ETHICIST', 'SYNTHESIZER',
    'ORACLE', 'COMMANDER', 'DEBUGGER', 'CREATIVE', 'ANALYST'
  ]),
  context: z.string(),
  input: z.string(),
  philosophy: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  temperature: z.number().min(0).max(2).optional()
});

const auditSchema = z.object({
  output: z.string(),
  context: z.string().optional(),
  nodeType: z.string().optional(),
  originalPrompt: z.string().optional()
});

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string()
  })),
  nodeType: z.enum([
    'SCOUT', 'ARCHITECT', 'CRITIC', 'ETHICIST', 'SYNTHESIZER',
    'ORACLE', 'COMMANDER', 'DEBUGGER', 'CREATIVE', 'ANALYST'
  ]).optional(),
  philosophy: z.enum(['FINLAND', 'KOREA', 'JAPAN']).optional(),
  stream: z.boolean().optional()
});

export class AIController {
  /**
   * POST /ai/command
   * The "Antigravity" endpoint - generates a graph from a command
   */
  generateGraph = asyncHandler(async (req: Request, res: Response) => {
    const validation = commandSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { command, philosophy, context, constraints } = validation.data;

    const graph = await aiEngine.generateGraph(
      command,
      req.user!.id,
      req.user!.subscriptionTier,
      (philosophy || req.user!.philosophyMode || 'JAPAN') as PhilosophyMode,
      {
        context,
        constraints
      }
    );

    res.json({
      success: true,
      data: graph
    });
  });

  /**
   * POST /ai/simulate
   * Run a single node task
   */
  simulateNode = asyncHandler(async (req: Request, res: Response) => {
    const validation = simulateSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { nodeType, context, input, philosophy, temperature } = validation.data;

    const result = await aiEngine.simulateNode(
      nodeType as AgentType,
      context,
      input,
      req.user!.id,
      req.user!.subscriptionTier,
      {
        philosophy: (philosophy || req.user!.philosophyMode || 'JAPAN') as PhilosophyMode,
        temperature
      }
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * POST /ai/audit
   * Verify output for hallucinations
   */
  auditOutput = asyncHandler(async (req: Request, res: Response) => {
    const validation = auditSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await aiEngine.auditOutput(
      validation.data.output,
      req.user!.id,
      req.user!.subscriptionTier,
      {
        context: validation.data.context,
        nodeType: validation.data.nodeType,
        originalPrompt: validation.data.originalPrompt
      }
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * POST /ai/chat
   * Multi-turn chat with an agent
   */
  chat = asyncHandler(async (req: Request, res: Response) => {
    const validation = chatSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { messages, nodeType, philosophy, stream } = validation.data;

    // For now, streaming is not implemented - would use SSE
    if (stream) {
      throw new ValidationError('Streaming not yet implemented');
    }

    const result = await aiEngine.chat(
      messages,
      req.user!.id,
      req.user!.subscriptionTier,
      {
        nodeType: nodeType as AgentType,
        philosophy: (philosophy || req.user!.philosophyMode || 'JAPAN') as PhilosophyMode
      }
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * GET /ai/agents
   * Get available agents and their descriptions
   */
  getAgents = asyncHandler(async (req: Request, res: Response) => {
    const agents = aiEngine.getAvailableAgents();

    res.json({
      success: true,
      data: agents
    });
  });

  /**
   * GET /ai/agents/:type
   * Get details for a specific agent
   */
  getAgentDetails = asyncHandler(async (req: Request, res: Response) => {
    const agentType = req.params.type.toUpperCase() as AgentType;
    const agent = aiEngine.getAgentDetails(agentType);

    if (!agent) {
      throw new ValidationError(`Unknown agent type: ${req.params.type}`);
    }

    res.json({
      success: true,
      data: agent
    });
  });

  /**
   * GET /ai/cost-estimate
   * Estimate cost for a command
   */
  estimateCost = asyncHandler(async (req: Request, res: Response) => {
    const { command, philosophy } = req.query;

    if (!command || typeof command !== 'string') {
      throw new ValidationError('Command is required');
    }

    const estimate = await aiEngine.estimateCost(
      command,
      (philosophy as PhilosophyMode) || 'JAPAN'
    );

    res.json({
      success: true,
      data: estimate
    });
  });

  /**
   * GET /ai/usage
   * Get AI usage statistics for current user
   */
  getUsage = asyncHandler(async (req: Request, res: Response) => {
    const { period } = req.query;

    const usage = await aiEngine.getUserUsage(
      req.user!.id,
      (period as 'day' | 'week' | 'month') || 'month'
    );

    res.json({
      success: true,
      data: usage
    });
  });

  /**
   * GET /ai/providers
   * Get available AI providers status
   */
  getProviders = asyncHandler(async (req: Request, res: Response) => {
    const providers = await aiEngine.getProviderStatus();

    res.json({
      success: true,
      data: providers
    });
  });

  /**
   * POST /ai/feedback
   * Submit feedback for an AI response
   */
  submitFeedback = asyncHandler(async (req: Request, res: Response) => {
    const { responseId, rating, comment, category } = req.body;

    if (!responseId || !rating) {
      throw new ValidationError('Response ID and rating are required');
    }

    await aiEngine.submitFeedback(req.user!.id, {
      responseId,
      rating,
      comment,
      category
    });

    res.json({
      success: true,
      message: 'Feedback submitted'
    });
  });
}

export const aiController = new AIController();
