import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { authService } from '../services/AuthService';
import { classroomService } from '../services/ClassroomService';
import { gamificationService } from '../services/GamificationService';
import { getRedisClient, REDIS_KEYS } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { config } from '../config';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  classroomId?: string;
}

interface StudentUpdate {
  status: 'FLOW' | 'STUCK' | 'IDLE';
  sentiment: number;
  nodeCount: number;
  currentNode?: string;
}

interface BroadcastMessage {
  message: string;
  type: 'INFO' | 'WARNING' | 'HINT' | 'CELEBRATION';
}

interface ChaosEvent {
  eventType: 'SOLAR_FLARE' | 'LOGIC_ROT' | 'DDOS' | 'MEMORY_LEAK' | 'QUANTUM_NOISE';
  duration: number;
  intensity: number;
}

export class SocketGateway {
  public io: Server;

  constructor(httpServer: HTTPServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: config.corsOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication required'));
        }

        const payload = await authService.verifyToken(token);
        socket.userId = payload!.userId;
        socket.userRole = payload!.role;

        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`Client connected: ${socket.id} (User: ${socket.userId})`);

      // Join user's personal room for direct messages
      socket.join(`user:${socket.userId}`);

      // Classroom events
      (socket as any).on('join_classroom', (data: any) => this.handleJoinClassroom(socket, data));
      (socket as any).on('leave_classroom', () => this.handleLeaveClassroom(socket));

      // Student events
      (socket as any).on('student_update', (data: any) => this.handleStudentUpdate(socket, data));
      (socket as any).on('raise_hand', (data: any) => this.handleRaiseHand(socket, data));
      (socket as any).on('lower_hand', () => this.handleLowerHand(socket));

      // Teacher events
      (socket as any).on('teacher_broadcast', (data: any) => this.handleTeacherBroadcast(socket, data));
      (socket as any).on('chaos_event', (data: any) => this.handleChaosEvent(socket, data));
      (socket as any).on('philosophy_change', (data: any) => this.handlePhilosophyChange(socket, data));
      (socket as any).on('grant_credits', (data: any) => this.handleGrantCredits(socket, data));
      (socket as any).on('dismiss_hand', (data: any) => this.handleDismissHand(socket, data));

      // Graph sync events
      (socket as any).on('graph_update', (data: any) => this.handleGraphUpdate(socket, data));

      // Disconnect
      (socket as any).on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * Handle classroom join
   */
  private async handleJoinClassroom(socket: AuthenticatedSocket, data: { classroomId: string; accessCode?: string }) {
    try {
      const { classroomId, accessCode } = data;

      // Verify access to classroom
      const classroom = await prisma.classroom.findUnique({
        where: { id: classroomId },
        include: { students: true }
      });

      if (!classroom) {
        socket.emit('error', { message: 'Classroom not found' });
        return;
      }

      const isTeacher = classroom.teacherId === socket.userId;
      const isStudent = classroom.students.some(s => s.studentId === socket.userId);

      if (!isTeacher && !isStudent) {
        socket.emit('error', { message: 'Access denied to this classroom' });
        return;
      }

      // Leave previous classroom if any
      if (socket.classroomId) {
        socket.leave(`class:${socket.classroomId}`);
      }

      // Join new classroom room
      socket.classroomId = classroomId;
      socket.join(`class:${classroomId}`);

      // Update Redis presence
      await getRedisClient().hset(
        `${REDIS_KEYS.CLASSROOM_STATE}:${classroomId}`,
        `presence:${socket.userId}`,
        JSON.stringify({
          socketId: socket.id,
          role: socket.userRole,
          joinedAt: new Date().toISOString()
        })
      );

      // Notify room of new member
      socket.to(`class:${classroomId}`).emit('user_joined', {
        userId: socket.userId,
        role: socket.userRole,
        timestamp: new Date().toISOString()
      });

      // Send current classroom state to joining user
      const state = await classroomService.getClassroomLiveData(classroomId, socket.userId!);
      socket.emit('classroom_state', state);

      console.log(`User ${socket.userId} joined classroom ${classroomId}`);
    } catch (error) {
      console.error('Error joining classroom:', error);
      socket.emit('error', { message: 'Failed to join classroom' });
    }
  }

  /**
   * Handle classroom leave
   */
  private async handleLeaveClassroom(socket: AuthenticatedSocket) {
    if (!socket.classroomId) return;

    const classroomId = socket.classroomId;

    // Remove from Redis presence
    await getRedisClient().hdel(
      `${REDIS_KEYS.CLASSROOM_STATE}:${classroomId}`,
      `presence:${socket.userId}`
    );

    // Notify room
    socket.to(`class:${classroomId}`).emit('user_left', {
      userId: socket.userId,
      timestamp: new Date().toISOString()
    });

    socket.leave(`class:${classroomId}`);
    socket.classroomId = undefined;
  }

  /**
   * Handle student status update
   */
  private async handleStudentUpdate(socket: AuthenticatedSocket, data: StudentUpdate) {
    if (!socket.classroomId || socket.userRole !== 'STUDENT') return;

    try {
      await classroomService.updateStudentStatus(
        socket.userId!,
        socket.classroomId,
        {
          status: data.status,
          sentiment: data.sentiment,
          nodeCount: data.nodeCount,
          currentNodeType: data.currentNode
        } as any
      );

      // Broadcast to teachers in the classroom
      socket.to(`class:${socket.classroomId}`).emit('student_status_update', {
        studentId: socket.userId,
        ...data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating student status:', error);
    }
  }

  /**
   * Handle raise hand
   */
  private async handleRaiseHand(socket: AuthenticatedSocket, data: { message?: string }) {
    if (!socket.classroomId) return;

    try {
      await classroomService.raiseHand(
        socket.userId!,
        socket.classroomId
      );

      // Notify teachers
      socket.to(`class:${socket.classroomId}`).emit('hand_raised', {
        studentId: socket.userId,
        message: data.message || 'Needs help',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error raising hand:', error);
    }
  }

  /**
   * Handle lower hand
   */
  private async handleLowerHand(socket: AuthenticatedSocket) {
    if (!socket.classroomId) return;

    try {
      await classroomService.lowerHand(socket.userId!, socket.classroomId);

      socket.to(`class:${socket.classroomId}`).emit('hand_lowered', {
        studentId: socket.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error lowering hand:', error);
    }
  }

  /**
   * Handle teacher broadcast
   */
  private async handleTeacherBroadcast(socket: AuthenticatedSocket, data: BroadcastMessage) {
    if (!socket.classroomId || (socket.userRole !== 'TEACHER' && socket.userRole !== 'ADMIN')) {
      socket.emit('error', { message: 'Not authorized to broadcast' });
      return;
    }

    try {
      // Store broadcast in DB
      await prisma.broadcast.create({
        data: {
          classroomId: socket.classroomId,
          teacherId: socket.userId!,
          message: data.message,
          type: data.type || 'INFO'
        }
      });

      // Send to all students in classroom
      this.io.to(`class:${socket.classroomId}`).emit('teacher_broadcast', {
        message: data.message,
        type: data.type || 'INFO',
        teacherId: socket.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting:', error);
    }
  }

  /**
   * Handle chaos event trigger
   */
  private async handleChaosEvent(socket: AuthenticatedSocket, data: ChaosEvent) {
    if (!socket.classroomId || (socket.userRole !== 'TEACHER' && socket.userRole !== 'ADMIN')) {
      socket.emit('error', { message: 'Not authorized to trigger chaos events' });
      return;
    }

    try {
      // Store chaos event in DB
      const chaosEvent = await prisma.chaosEvent.create({
        data: {
          classroomId: socket.classroomId,
          triggeredBy: socket.userId!,
          eventType: data.eventType,
          duration: data.duration || 60,
          intensity: data.intensity || 0.5
        }
      });

      // Send to all students in classroom
      this.io.to(`class:${socket.classroomId}`).emit('chaos_event', {
        id: chaosEvent.id,
        eventType: data.eventType,
        duration: data.duration || 60,
        intensity: data.intensity || 0.5,
        timestamp: new Date().toISOString()
      });

      // Schedule chaos event end
      setTimeout(() => {
        this.io.to(`class:${socket.classroomId}`).emit('chaos_event_end', {
          id: chaosEvent.id,
          eventType: data.eventType
        });
      }, (data.duration || 60) * 1000);

    } catch (error) {
      console.error('Error triggering chaos event:', error);
    }
  }

  /**
   * Handle philosophy change
   */
  private async handlePhilosophyChange(socket: AuthenticatedSocket, data: { philosophy: string }) {
    if (!socket.classroomId || (socket.userRole !== 'TEACHER' && socket.userRole !== 'ADMIN')) {
      socket.emit('error', { message: 'Not authorized to change philosophy' });
      return;
    }

    try {
      await classroomService.updateClassroom(
        socket.classroomId,
        socket.userId!,
        { currentPhilosophy: data.philosophy as any }
      );

      // Notify all clients in classroom
      this.io.to(`class:${socket.classroomId}`).emit('philosophy_change', {
        philosophy: data.philosophy,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error changing philosophy:', error);
    }
  }

  /**
   * Handle grant credits
   */
  private async handleGrantCredits(socket: AuthenticatedSocket, data: { amount: number; studentIds?: string[] }) {
    if (!socket.classroomId || (socket.userRole !== 'TEACHER' && socket.userRole !== 'ADMIN')) {
      socket.emit('error', { message: 'Not authorized to grant credits' });
      return;
    }

    try {
      const result = await classroomService.grantCredits(
        socket.classroomId,
        socket.userId!,
        data.amount,
        data.studentIds
      );

      // Notify students who received credits
      result.students.forEach(studentId => {
        this.io.to(`user:${studentId}`).emit('grant_credits', {
          amount: data.amount,
          from: socket.userId,
          timestamp: new Date().toISOString()
        });
      });

      socket.emit('credits_granted', result);
    } catch (error) {
      console.error('Error granting credits:', error);
    }
  }

  /**
   * Handle dismiss hand (teacher dismisses a student's raised hand)
   */
  private async handleDismissHand(socket: AuthenticatedSocket, data: { studentId: string }) {
    if (!socket.classroomId || (socket.userRole !== 'TEACHER' && socket.userRole !== 'ADMIN')) {
      socket.emit('error', { message: 'Not authorized to dismiss hands' });
      return;
    }

    try {
      await classroomService.lowerHand(data.studentId, socket.classroomId);

      // Notify the student
      this.io.to(`user:${data.studentId}`).emit('hand_dismissed', {
        by: socket.userId,
        timestamp: new Date().toISOString()
      });

      // Notify classroom
      socket.to(`class:${socket.classroomId}`).emit('hand_lowered', {
        studentId: data.studentId,
        dismissedBy: socket.userId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error dismissing hand:', error);
    }
  }

  /**
   * Handle graph update (for collaborative features)
   */
  private async handleGraphUpdate(socket: AuthenticatedSocket, data: { sessionId: string; nodes: any[]; connections: any[] }) {
    if (!socket.classroomId) return;

    // Broadcast graph update to classroom (for shared viewing)
    socket.to(`class:${socket.classroomId}`).emit('graph_update', {
      userId: socket.userId,
      sessionId: data.sessionId,
      nodeCount: data.nodes.length,
      connectionCount: data.connections.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Handle disconnect
   */
  private async handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`Client disconnected: ${socket.id}`);

    if (socket.classroomId) {
      // Remove from Redis presence
      await getRedisClient().hdel(
        `${REDIS_KEYS.CLASSROOM_STATE}:${socket.classroomId}`,
        `presence:${socket.userId}`
      );

      // Notify room
      socket.to(`class:${socket.classroomId}`).emit('user_left', {
        userId: socket.userId,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Emit level up notification
   */
  async emitLevelUp(userId: string, level: number, unlockedNodes: string[]) {
    this.io.to(`user:${userId}`).emit('level_up', {
      level,
      unlockedNodes,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit achievement notification
   */
  async emitAchievement(userId: string, achievement: any) {
    this.io.to(`user:${userId}`).emit('achievement_unlocked', {
      ...achievement,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Emit system notification to user
   */
  async emitNotification(userId: string, notification: { type: string; title: string; message: string }) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get active connections count
   */
  getConnectionsCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Get classroom members
   */
  async getClassroomMembers(classroomId: string): Promise<string[]> {
    const sockets = await this.io.in(`class:${classroomId}`).fetchSockets();
    return sockets.map(s => (s as any).userId).filter(Boolean);
  }
}

let socketGateway: SocketGateway;

export const initializeSocketGateway = (httpServer: HTTPServer): SocketGateway => {
  socketGateway = new SocketGateway(httpServer);
  return socketGateway;
};

export const getSocketGateway = (): SocketGateway => {
  if (!socketGateway) {
    throw new Error('Socket gateway not initialized');
  }
  return socketGateway;
};
