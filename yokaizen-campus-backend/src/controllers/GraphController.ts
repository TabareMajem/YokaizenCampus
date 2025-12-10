import { Request, Response } from 'express';
import { z } from 'zod';
import { graphService } from '../services/GraphService';
import { asyncHandler, ValidationError } from '../middleware/errorHandler';

// Validation schemas
const syncGraphSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.record(z.any()).optional()
  })),
  connections: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string().optional()
  })),
  status: z.enum(['FLOW', 'STUCK', 'IDLE']).optional(),
  sentimentScore: z.number().int().min(0).max(100).optional()
});

const createSessionSchema = z.object({
  classroomId: z.string().uuid().optional(),
  initialCommand: z.string().optional()
});

const auditNodeSchema = z.object({
  nodeId: z.string(),
  output: z.string(),
  expectedBehavior: z.string().optional(),
  context: z.string().optional()
});

const nodeActionSchema = z.object({
  nodeId: z.string(),
  action: z.enum(['EXECUTE', 'PAUSE', 'RESUME', 'DELETE', 'DUPLICATE']),
  data: z.record(z.any()).optional()
});

export class GraphController {
  /**
   * POST /graph
   * Create a new graph session
   */
  createSession = asyncHandler(async (req: Request, res: Response) => {
    const validation = createSessionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const session = await graphService.createSession(
      req.user!.id,
      validation.data.classroomId,
      validation.data.initialCommand
    );

    res.status(201).json({
      success: true,
      message: 'Graph session created',
      data: session
    });
  });

  /**
   * GET /graph
   * Get all graph sessions for the current user
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const { classroomId, status, limit, offset } = req.query;

    const sessions = await graphService.getUserSessions(req.user!.id, {
      classroomId: classroomId as string,
      status: status as 'FLOW' | 'STUCK' | 'IDLE' | 'COMPLETED',
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0
    });

    res.json({
      success: true,
      data: sessions
    });
  });

  /**
   * GET /graph/:id
   * Get a specific graph session
   */
  getSession = asyncHandler(async (req: Request, res: Response) => {
    const session = await graphService.getSession(req.params.id, req.user!.id);

    res.json({
      success: true,
      data: session
    });
  });

  /**
   * PUT /graph/:id/sync
   * Sync graph state (autosave)
   */
  syncGraph = asyncHandler(async (req: Request, res: Response) => {
    const validation = syncGraphSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const session = await graphService.syncGraph(
      req.params.id,
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      message: 'Graph synced',
      data: {
        id: session.id,
        status: session.status,
        lastSync: session.updatedAt
      }
    });
  });

  /**
   * POST /graph/:id/audit
   * Audit a node output for hallucinations
   */
  auditNode = asyncHandler(async (req: Request, res: Response) => {
    const validation = auditNodeSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await graphService.auditNode(
      req.params.id,
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * POST /graph/:id/node
   * Perform action on a node
   */
  nodeAction = asyncHandler(async (req: Request, res: Response) => {
    const validation = nodeActionSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await graphService.performNodeAction(
      req.params.id,
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      data: result
    });
  });

  /**
   * POST /graph/:id/complete
   * Mark graph session as completed
   */
  completeSession = asyncHandler(async (req: Request, res: Response) => {
    const session = await graphService.completeSession(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Session completed',
      data: session
    });
  });

  /**
   * DELETE /graph/:id
   * Delete a graph session
   */
  deleteSession = asyncHandler(async (req: Request, res: Response) => {
    await graphService.deleteSession(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Session deleted'
    });
  });

  /**
   * POST /graph/:id/fork
   * Fork/duplicate a graph session
   */
  forkSession = asyncHandler(async (req: Request, res: Response) => {
    const { newName } = req.body;

    const session = await graphService.forkSession(
      req.params.id,
      req.user!.id,
      newName
    );

    res.status(201).json({
      success: true,
      message: 'Session forked',
      data: session
    });
  });

  /**
   * GET /graph/:id/history
   * Get graph history/timeline
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query;

    const history = await graphService.getSessionHistory(
      req.params.id,
      req.user!.id,
      limit ? parseInt(limit as string) : 50
    );

    res.json({
      success: true,
      data: history
    });
  });

  /**
   * POST /graph/:id/snapshot
   * Create a named snapshot of current graph state
   */
  createSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const { name, description } = req.body;

    if (!name) {
      throw new ValidationError('Snapshot name is required');
    }

    const snapshot = await graphService.createSnapshot(
      req.params.id,
      req.user!.id,
      name,
      description
    );

    res.status(201).json({
      success: true,
      message: 'Snapshot created',
      data: snapshot
    });
  });

  /**
   * POST /graph/:id/restore/:snapshotId
   * Restore graph to a previous snapshot
   */
  restoreSnapshot = asyncHandler(async (req: Request, res: Response) => {
    const session = await graphService.restoreSnapshot(
      req.params.id,
      req.params.snapshotId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Snapshot restored',
      data: session
    });
  });

  /**
   * GET /graph/stats
   * Get user's graph statistics
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await graphService.getUserStats(req.user!.id);

    res.json({
      success: true,
      data: stats
    });
  });
}

export const graphController = new GraphController();
