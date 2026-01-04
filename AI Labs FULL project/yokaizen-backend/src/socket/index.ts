import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '@config/env';
import { redis } from '@config/redis';
import { logger, socketLogger } from '@config/logger';
import { JWTPayload } from '@/types';

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload;
}

interface SquadRoomData {
  squadId: string;
  onlineMembers: Set<string>;
}

const squadRooms = new Map<string, SquadRoomData>();

export function initializeSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: config.app.corsOrigins.split(','),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      socket.user = decoded;

      // Mark user as online
      await redis.set(`user_online:${decoded.userId}`, socket.id, 'EX', 300);

      next();
    } catch (error) {
      socketLogger.warn('Socket auth failed', { error });
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.user!.userId;
    const squadId = socket.user!.squadId;

    socketLogger.info('Client connected', { userId, socketId: socket.id });

    // =========== Squad Room Handlers ===========

    // Join squad room
    socket.on('join_squad_room', async (data: { squadId: string }) => {
      if (!squadId || squadId !== data.squadId) {
        socket.emit('error', { message: 'Not a member of this squad' });
        return;
      }

      const roomName = `squad:${squadId}`;
      socket.join(roomName);

      // Track online members
      if (!squadRooms.has(squadId)) {
        squadRooms.set(squadId, {
          squadId,
          onlineMembers: new Set(),
        });
      }
      squadRooms.get(squadId)!.onlineMembers.add(userId);

      // Update Redis
      await redis.sadd(`squad_online:${squadId}`, userId);

      // Broadcast member joined
      io.to(roomName).emit('member_status_change', {
        userId,
        status: 'online',
        onlineCount: squadRooms.get(squadId)!.onlineMembers.size,
      });

      socketLogger.debug('User joined squad room', { userId, squadId });
    });

    // Leave squad room
    socket.on('leave_squad_room', async (data: { squadId: string }) => {
      await handleLeaveSquadRoom(socket, data.squadId, io);
    });

    // Squad chat message
    socket.on('squad_message', async (data: { squadId: string; message: string }) => {
      if (!squadId || squadId !== data.squadId) {
        socket.emit('error', { message: 'Not a member of this squad' });
        return;
      }

      const roomName = `squad:${squadId}`;
      const messageData = {
        userId,
        username: socket.user!.firebaseUid, // Would be username in production
        message: data.message,
        timestamp: new Date().toISOString(),
      };

      // Store in Redis for persistence
      await redis.lpush(`squad_chat:${squadId}`, JSON.stringify(messageData));
      await redis.ltrim(`squad_chat:${squadId}`, 0, 99); // Keep last 100 messages

      // Broadcast to room
      io.to(roomName).emit('squad_message', messageData);
    });

    // Mission started
    socket.on('mission_start', async (data: { squadId: string; missionId: string }) => {
      if (!squadId || squadId !== data.squadId) return;

      const roomName = `squad:${squadId}`;
      io.to(roomName).emit('mission_update', {
        type: 'DEPLOYING',
        missionId: data.missionId,
        timestamp: new Date().toISOString(),
      });
    });

    // Mission progress update
    socket.on('mission_progress', async (data: {
      squadId: string;
      missionId: string;
      progress: number;
      contribution: number;
    }) => {
      if (!squadId || squadId !== data.squadId) return;

      const roomName = `squad:${squadId}`;
      io.to(roomName).emit('mission_update', {
        type: 'PROGRESS',
        missionId: data.missionId,
        userId,
        progress: data.progress,
        contribution: data.contribution,
        timestamp: new Date().toISOString(),
      });
    });

    // =========== Global Room Handlers ===========

    // Join global ticker room
    socket.on('join_global', () => {
      socket.join('global');
      socketLogger.debug('User joined global room', { userId });
    });

    // Leave global room
    socket.on('leave_global', () => {
      socket.leave('global');
    });

    // =========== Game Session Handlers ===========

    // Game started
    socket.on('game_started', (data: { gameType: string; difficulty: string }) => {
      // Could broadcast to friends or squad
      if (squadId) {
        io.to(`squad:${squadId}`).emit('member_activity', {
          userId,
          activity: 'game_started',
          gameType: data.gameType,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Game completed
    socket.on('game_completed', (data: {
      gameType: string;
      score: number;
      xpGained: number;
      levelUp?: boolean;
    }) => {
      // Broadcast achievement to squad
      if (squadId) {
        io.to(`squad:${squadId}`).emit('member_activity', {
          userId,
          activity: 'game_completed',
          ...data,
          timestamp: new Date().toISOString(),
        });
      }

      // Broadcast significant achievements to global ticker
      if (data.levelUp || data.xpGained > 100) {
        io.to('global').emit('ticker_update', {
          type: 'ACHIEVEMENT',
          message: `A player just ${data.levelUp ? 'leveled up' : 'scored big'}!`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // =========== Typing Indicators ===========

    socket.on('typing_start', (data: { squadId: string }) => {
      if (!squadId || squadId !== data.squadId) return;
      socket.to(`squad:${squadId}`).emit('user_typing', { userId, typing: true });
    });

    socket.on('typing_stop', (data: { squadId: string }) => {
      if (!squadId || squadId !== data.squadId) return;
      socket.to(`squad:${squadId}`).emit('user_typing', { userId, typing: false });
    });

    // =========== Disconnect Handler ===========

    socket.on('disconnect', async (reason) => {
      socketLogger.info('Client disconnected', { userId, reason });

      // Remove from online tracking
      await redis.del(`user_online:${userId}`);

      // Handle squad room cleanup
      if (squadId) {
        await handleLeaveSquadRoom(socket, squadId, io);
      }
    });

    // Error handler
    socket.on('error', (error: any) => {
      socketLogger.error(error, { userId });
    });
  });

  // =========== Server-side Event Emitters ===========

  // Global ticker updates (call from services)
  const emitTickerUpdate = (message: string, type: string = 'NEWS') => {
    io.to('global').emit('ticker_update', {
      type,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  // Leaderboard updates
  const emitLeaderboardUpdate = (leaderboardType: string, data: any) => {
    io.to('global').emit('leaderboard_update', {
      type: leaderboardType,
      data,
      timestamp: new Date().toISOString(),
    });
  };

  // Squad-specific notifications
  const emitToSquad = (squadId: string, event: string, data: any) => {
    io.to(`squad:${squadId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  };

  // User-specific notifications
  const emitToUser = async (userId: string, event: string, data: any) => {
    const socketId = await redis.get(`user_online:${userId}`);
    if (socketId) {
      io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // Attach emitters to io for use in services
  (io as any).emitTickerUpdate = emitTickerUpdate;
  (io as any).emitLeaderboardUpdate = emitLeaderboardUpdate;
  (io as any).emitToSquad = emitToSquad;
  (io as any).emitToUser = emitToUser;

  socketLogger.info('Socket.io server initialized');

  return io;
}

async function handleLeaveSquadRoom(
  socket: AuthenticatedSocket,
  squadId: string,
  io: Server
): Promise<void> {
  const userId = socket.user!.userId;
  const roomName = `squad:${squadId}`;

  socket.leave(roomName);

  // Update tracking
  const roomData = squadRooms.get(squadId);
  if (roomData) {
    roomData.onlineMembers.delete(userId);

    if (roomData.onlineMembers.size === 0) {
      squadRooms.delete(squadId);
    }
  }

  // Update Redis
  await redis.srem(`squad_online:${squadId}`, userId);

  // Broadcast member left
  io.to(roomName).emit('member_status_change', {
    userId,
    status: 'offline',
    onlineCount: roomData?.onlineMembers.size || 0,
  });
}

// Periodic ticker updates (fake market news)
export function startTickerUpdates(io: Server): void {
  const tickerMessages = [
    'Market volatility increases as new AI regulations announced',
    'Tech sector shows strong Q4 performance',
    'Breaking: Major partnership announced in gaming industry',
    'Analysts predict growth in AI-powered wellness apps',
    'Global leaderboard competition heating up!',
    'New game mode unlocked for all players',
    'Weekend bonus XP event starting soon!',
  ];

  setInterval(() => {
    const message = tickerMessages[Math.floor(Math.random() * tickerMessages.length)];
    (io as any).emitTickerUpdate?.(message, 'NEWS');
  }, 30000); // Every 30 seconds
}

export type { AuthenticatedSocket };
