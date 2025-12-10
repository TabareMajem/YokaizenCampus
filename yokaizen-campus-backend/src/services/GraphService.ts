import { prisma } from '../utils/prisma';
import { redis } from '../utils/redis';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { GraphStatus, SubscriptionTier } from '@prisma/client';
import { aiEngine } from './AiEngine';
import { gamificationService } from './GamificationService';

// Types
interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    input?: string;
    output?: string;
    confidence?: number;
    status?: 'idle' | 'running' | 'complete' | 'error';
    error?: string;
  };
}

interface GraphConnection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface GraphState {
  nodes: GraphNode[];
  connections: GraphConnection[];
  status: GraphStatus;
  sentimentScore: number;
}

interface SyncInput {
  userId: string;
  classroomId?: string;
  nodes: GraphNode[];
  connections: GraphConnection[];
  status?: GraphStatus;
  sentiment?: number;
}

interface AuditResult {
  nodeId: string;
  isHallucination: boolean;
  confidence: number;
  issues: string[];
  suggestions: string[];
}

export class GraphService {
  private readonly GRAPH_CACHE_PREFIX = 'graph:session:';
  private readonly CACHE_TTL = 1800; // 30 minutes

  /**
   * Create a new graph session
   */
  async createSession(userId: string, classroomId?: string) {
    // Check if session already exists for this user/classroom combo
    const existing = await prisma.graphSession.findFirst({
      where: {
        userId,
        classroomId: classroomId || null
      }
    });

    if (existing) {
      return existing;
    }

    const session = await prisma.graphSession.create({
      data: {
        userId,
        classroomId,
        nodes: [],
        connections: [],
        status: GraphStatus.IDLE,
        sentimentScore: 50
      }
    });

    // Cache the session
    await this.cacheSession(session.id, {
      nodes: [],
      connections: [],
      status: GraphStatus.IDLE,
      sentimentScore: 50
    });

    // Log the action
    await this.logAction(userId, 'GRAPH_CREATE', { sessionId: session.id, classroomId });

    return session;
  }

  /**
   * Get or create session for user
   */
  async getOrCreateSession(userId: string, classroomId?: string) {
    let session = await prisma.graphSession.findFirst({
      where: {
        userId,
        classroomId: classroomId || null
      }
    });

    if (!session) {
      session = await this.createSession(userId, classroomId);
    }

    return session;
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, userId: string) {
    // Try cache first
    const cached = await this.getCachedSession(sessionId);
    if (cached) {
      return {
        id: sessionId,
        ...cached,
        fromCache: true
      };
    }

    const session = await prisma.graphSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundError('Graph session not found');
    }

    // Verify ownership
    if (session.userId !== userId) {
      // Check if user is teacher of the classroom
      if (session.classroomId) {
        const classroom = await prisma.classroom.findUnique({
          where: { id: session.classroomId }
        });
        if (classroom?.teacherId !== userId) {
          throw new ForbiddenError('Access denied to this graph session');
        }
      } else {
        throw new ForbiddenError('Access denied to this graph session');
      }
    }

    // Cache for future requests
    await this.cacheSession(sessionId, {
      nodes: session.nodes as GraphNode[],
      connections: session.connections as GraphConnection[],
      status: session.status,
      sentimentScore: session.sentimentScore
    });

    return session;
  }

  /**
   * Sync graph state (debounced autosave)
   */
  async syncGraph(input: SyncInput) {
    const { userId, classroomId, nodes, connections, status, sentiment } = input;

    // Get or create session
    const session = await this.getOrCreateSession(userId, classroomId);

    // Validate nodes structure
    this.validateNodes(nodes);
    this.validateConnections(connections, nodes);

    // Calculate status based on graph state if not provided
    const calculatedStatus = status || this.calculateStatus(nodes);
    const sentimentScore = sentiment ?? session.sentimentScore;

    // Update database
    const updated = await prisma.graphSession.update({
      where: { id: session.id },
      data: {
        nodes: nodes as any,
        connections: connections as any,
        status: calculatedStatus,
        sentimentScore
      }
    });

    // Update cache
    await this.cacheSession(session.id, {
      nodes,
      connections,
      status: calculatedStatus,
      sentimentScore
    });

    // Log significant changes
    if (nodes.length !== (session.nodes as any[]).length) {
      await this.logAction(userId, 'GRAPH_UPDATE', {
        sessionId: session.id,
        nodeCount: nodes.length,
        status: calculatedStatus
      });
    }

    return {
      sessionId: session.id,
      status: calculatedStatus,
      nodeCount: nodes.length,
      connectionCount: connections.length,
      lastSynced: updated.updatedAt
    };
  }

  /**
   * Execute a graph - run all nodes in order
   */
  async executeGraph(userId: string, sessionId: string) {
    const session = await this.getSession(sessionId, userId);
    const nodes = session.nodes as GraphNode[];
    const connections = session.connections as GraphConnection[];

    if (nodes.length === 0) {
      throw new AppError('Cannot execute empty graph', 400);
    }

    // Get user for tier info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, credits: true, philosophyMode: true }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Build execution order (topological sort)
    const executionOrder = this.topologicalSort(nodes, connections);
    const results: Map<string, any> = new Map();

    // Execute nodes in order
    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Get inputs from connected nodes
      const inputConnections = connections.filter(c => c.target === nodeId);
      const inputs = inputConnections.map(c => results.get(c.source)).filter(Boolean);
      const combinedInput = inputs.length > 0 
        ? inputs.join('\n---\n')
        : node.data.input || '';

      try {
        // Execute via AI engine
        const result = await aiEngine.simulateNode(
          node.type,
          { userInput: combinedInput, previousOutputs: inputs },
          user.subscriptionTier,
          userId,
          user.philosophyMode
        );

        results.set(nodeId, result.output);

        // Update node data
        node.data.output = result.output;
        node.data.confidence = result.confidence;
        node.data.status = 'complete';
      } catch (error: any) {
        node.data.status = 'error';
        node.data.error = error.message;
        results.set(nodeId, null);
      }
    }

    // Update session with results
    await prisma.graphSession.update({
      where: { id: sessionId },
      data: {
        nodes: nodes as any,
        status: GraphStatus.FLOW
      }
    });

    // Award XP for execution
    await gamificationService.awardXP(userId, 'GRAPH_EXECUTE', {
      nodeCount: nodes.length,
      sessionId
    });

    // Log execution
    await this.logAction(userId, 'GRAPH_EXECUTE', {
      sessionId,
      nodeCount: nodes.length,
      successCount: Array.from(results.values()).filter(Boolean).length
    });

    return {
      sessionId,
      executedNodes: executionOrder.length,
      results: Object.fromEntries(results),
      status: GraphStatus.FLOW
    };
  }

  /**
   * Audit a specific node output for hallucinations
   */
  async auditNode(
    userId: string,
    sessionId: string,
    nodeId: string
  ): Promise<AuditResult> {
    const session = await this.getSession(sessionId, userId);
    const nodes = session.nodes as GraphNode[];
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new NotFoundError('Node not found in graph');
    }

    if (!node.data.output) {
      throw new AppError('Node has no output to audit', 400);
    }

    // Get user tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, philosophyMode: true }
    });

    // Perform audit via AI engine
    const auditResult = await aiEngine.auditOutput(
      node.data.output,
      node.data.input || '',
      user?.subscriptionTier || SubscriptionTier.FREE,
      userId
    );

    // Log the audit
    await this.logAction(userId, 'NODE_AUDIT', {
      sessionId,
      nodeId,
      isHallucination: auditResult.isHallucination,
      confidence: auditResult.confidence
    });

    // Award XP if hallucination found and fixed
    if (auditResult.isHallucination) {
      await gamificationService.awardXP(userId, 'AUDIT_HALLUCINATION', {
        sessionId,
        nodeId
      });
    }

    return {
      nodeId,
      isHallucination: auditResult.isHallucination,
      confidence: auditResult.confidence,
      issues: auditResult.issues,
      suggestions: auditResult.suggestions
    };
  }

  /**
   * Get graph history for a user
   */
  async getGraphHistory(userId: string, limit: number = 10) {
    const sessions = await prisma.graphSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        sentimentScore: true,
        createdAt: true,
        updatedAt: true,
        classroomId: true,
        nodes: true
      }
    });

    return sessions.map(s => ({
      ...s,
      nodeCount: (s.nodes as any[]).length
    }));
  }

  /**
   * Delete a graph session
   */
  async deleteSession(userId: string, sessionId: string) {
    const session = await prisma.graphSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      throw new NotFoundError('Graph session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenError('Cannot delete another user\'s session');
    }

    await prisma.graphSession.delete({
      where: { id: sessionId }
    });

    // Clear cache
    await redis.del(`${this.GRAPH_CACHE_PREFIX}${sessionId}`);

    // Log deletion
    await this.logAction(userId, 'GRAPH_DELETE', { sessionId });

    return { success: true };
  }

  /**
   * Clone a graph session
   */
  async cloneSession(userId: string, sessionId: string) {
    const original = await this.getSession(sessionId, userId);

    const clone = await prisma.graphSession.create({
      data: {
        userId,
        classroomId: null, // Don't clone into classroom
        nodes: original.nodes as any,
        connections: original.connections as any,
        status: GraphStatus.IDLE,
        sentimentScore: 50
      }
    });

    await this.logAction(userId, 'GRAPH_CLONE', {
      originalSessionId: sessionId,
      newSessionId: clone.id
    });

    return clone;
  }

  /**
   * Get classroom graphs (for teacher)
   */
  async getClassroomGraphs(classroomId: string, teacherId: string) {
    // Verify teacher owns classroom
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId }
    });

    if (!classroom) {
      throw new NotFoundError('Classroom not found');
    }

    if (classroom.teacherId !== teacherId) {
      throw new ForbiddenError('Only classroom teacher can view all graphs');
    }

    const sessions = await prisma.graphSession.findMany({
      where: { classroomId },
      include: {
        user: {
          select: { id: true, fullName: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Anonymize if needed
    if (classroom.isAnonymized) {
      const enrollments = await prisma.classroomStudent.findMany({
        where: { classroomId }
      });
      const anonymousMap = new Map(
        enrollments.map(e => [e.studentId, e.anonymousId])
      );

      return sessions.map(s => ({
        ...s,
        user: {
          id: s.user.id,
          fullName: anonymousMap.get(s.user.id) || 'Anonymous'
        },
        nodeCount: (s.nodes as any[]).length
      }));
    }

    return sessions.map(s => ({
      ...s,
      nodeCount: (s.nodes as any[]).length
    }));
  }

  // Private helper methods

  private async cacheSession(sessionId: string, state: GraphState) {
    const key = `${this.GRAPH_CACHE_PREFIX}${sessionId}`;
    await redis.setex(key, this.CACHE_TTL, JSON.stringify(state));
  }

  private async getCachedSession(sessionId: string): Promise<GraphState | null> {
    const key = `${this.GRAPH_CACHE_PREFIX}${sessionId}`;
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  }

  private validateNodes(nodes: GraphNode[]) {
    const validTypes = [
      'SCOUT', 'ARCHITECT', 'CRITIC', 'ETHICIST', 'SYNTHESIZER',
      'ORACLE', 'COMMANDER', 'DEBUGGER', 'CREATIVE', 'ANALYST', 'INPUT', 'OUTPUT'
    ];

    for (const node of nodes) {
      if (!node.id || typeof node.id !== 'string') {
        throw new AppError('Invalid node: missing or invalid id', 400);
      }
      if (!node.type || !validTypes.includes(node.type)) {
        throw new AppError(`Invalid node type: ${node.type}`, 400);
      }
      if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
        throw new AppError('Invalid node: missing or invalid position', 400);
      }
    }
  }

  private validateConnections(connections: GraphConnection[], nodes: GraphNode[]) {
    const nodeIds = new Set(nodes.map(n => n.id));

    for (const conn of connections) {
      if (!conn.id || typeof conn.id !== 'string') {
        throw new AppError('Invalid connection: missing or invalid id', 400);
      }
      if (!nodeIds.has(conn.source)) {
        throw new AppError(`Invalid connection: source node ${conn.source} not found`, 400);
      }
      if (!nodeIds.has(conn.target)) {
        throw new AppError(`Invalid connection: target node ${conn.target} not found`, 400);
      }
    }

    // Check for cycles
    if (this.hasCycle(nodes, connections)) {
      throw new AppError('Invalid graph: contains cycle', 400);
    }
  }

  private hasCycle(nodes: GraphNode[], connections: GraphConnection[]): boolean {
    const adjacency = new Map<string, string[]>();
    nodes.forEach(n => adjacency.set(n.id, []));
    connections.forEach(c => {
      adjacency.get(c.source)?.push(c.target);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      for (const neighbor of adjacency.get(nodeId) || []) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) return true;
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) return true;
      }
    }

    return false;
  }

  private topologicalSort(nodes: GraphNode[], connections: GraphConnection[]): string[] {
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(n => {
      adjacency.set(n.id, []);
      inDegree.set(n.id, 0);
    });

    connections.forEach(c => {
      adjacency.get(c.source)?.push(c.target);
      inDegree.set(c.target, (inDegree.get(c.target) || 0) + 1);
    });

    const queue: string[] = [];
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });

    const result: string[] = [];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      for (const neighbor of adjacency.get(current) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }

    return result;
  }

  private calculateStatus(nodes: GraphNode[]): GraphStatus {
    if (nodes.length === 0) return GraphStatus.IDLE;

    const hasErrors = nodes.some(n => n.data.status === 'error');
    if (hasErrors) return GraphStatus.STUCK;

    const hasRunning = nodes.some(n => n.data.status === 'running');
    if (hasRunning) return GraphStatus.FLOW;

    const allComplete = nodes.every(n => n.data.status === 'complete');
    if (allComplete) return GraphStatus.FLOW;

    return GraphStatus.IDLE;
  }

  private async logAction(userId: string, actionType: string, details: any) {
    await prisma.auditLog.create({
      data: {
        userId,
        actionType,
        details: JSON.stringify(details),
        meta: details
      }
    });
  }
}

export const graphService = new GraphService();
