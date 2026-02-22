import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { gamificationService } from '../services/GamificationService';
import { asyncHandler, ValidationError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const scanSchema = z.object({
  markerContent: z.string().min(1, 'Marker content is required'),
  location: z.object({
    latitude: z.number().optional(),
    longitude: z.number().optional()
  }).optional()
});

const createMarkerSchema = z.object({
  codeContent: z.string().min(8, 'Code must be at least 8 characters'),
  unlocksAgent: z.string(),
  loreText: z.string().min(10, 'Lore text must be at least 10 characters'),
  xpReward: z.number().int().min(0).max(500).optional().default(100),
  isOneTime: z.boolean().optional().default(false),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxScans: z.number().int().min(1).optional(),
  location: z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    radius: z.number().optional()
  }).optional()
});

const updateMarkerSchema = z.object({
  loreText: z.string().min(10).optional(),
  xpReward: z.number().int().min(0).max(500).optional(),
  isActive: z.boolean().optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  maxScans: z.number().int().min(1).optional()
});

export class ARController {
  /**
   * POST /ar/scan
   * Scan an AR marker/QR code
   */
  scan = asyncHandler(async (req: Request, res: Response) => {
    const validation = scanSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const { markerContent, location } = validation.data;

    // Find the marker
    const marker = await prisma.aRMarker.findUnique({
      where: { codeContent: markerContent }
    });

    if (!marker) {
      res.json({
        success: false,
        message: 'Unknown marker',
        data: { unlocked: false }
      });
      return;
    }

    // Check if marker is active
    if (!marker.isActive) {
      res.json({
        success: false,
        message: 'This marker is no longer active',
        data: { unlocked: false }
      });
      return;
    }

    // Check validity period
    const now = new Date();
    if (marker.validFrom && new Date(marker.validFrom) > now) {
      res.json({
        success: false,
        message: 'This marker is not yet active',
        data: { unlocked: false }
      });
      return;
    }

    if (marker.validUntil && new Date(marker.validUntil) < now) {
      res.json({
        success: false,
        message: 'This marker has expired',
        data: { unlocked: false }
      });
      return;
    }

    // Check max scans
    if (marker.maxScans && marker.scanCount >= marker.maxScans) {
      res.json({
        success: false,
        message: 'This marker has reached its scan limit',
        data: { unlocked: false }
      });
      return;
    }

    // Check if user already scanned (for one-time markers)
    const existingScan = await prisma.aRScan.findFirst({
      where: {
        markerId: marker.id,
        userId: req.user!.userId
      }
    });

    if (existingScan && marker.isOneTime) {
      res.json({
        success: true,
        message: 'You have already scanned this marker',
        data: {
          unlocked: false,
          alreadyScanned: true,
          agent: marker.unlocksAgent,
          lore: marker.loreText
        }
      });
      return;
    }

    // Try to unlock the agent
    const unlockResult = await gamificationService.unlockAgentViaAR(
      req.user!.userId,
      marker.unlocksAgent as any
    );

    // Record the scan
    await prisma.aRScan.create({
      data: {
        markerId: marker.id,
        userId: req.user!.userId,
        latitude: location?.latitude,
        longitude: location?.longitude,
        successful: !unlockResult.alreadyUnlocked
      }
    });

    // Increment scan count
    await prisma.aRMarker.update({
      where: { id: marker.id },
      data: { scanCount: { increment: 1 } }
    });

    // Award XP if first scan
    if (!existingScan && marker.xpReward > 0) {
      await gamificationService.awardXP(
        req.user!.userId,
        'GRAPH_EXECUTE', // Using fallback since AR_SCAN might be custom
        100,
        { markerId: marker.id, agent: marker.unlocksAgent, customXP: marker.xpReward }
      );
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        actionType: 'AR_SCAN',
        details: `Scanned marker: ${marker.unlocksAgent}`,
        meta: {
          markerId: marker.id,
          unlocked: !unlockResult.alreadyUnlocked,
          agent: marker.unlocksAgent
        }
      }
    });

    res.json({
      success: true,
      data: {
        unlocked: !unlockResult.alreadyUnlocked,
        alreadyUnlocked: unlockResult.alreadyUnlocked,
        agent: marker.unlocksAgent,
        lore: marker.loreText,
        xpAwarded: !existingScan ? marker.xpReward : 0,
        message: !unlockResult.alreadyUnlocked
          ? `You unlocked ${marker.unlocksAgent}!`
          : unlockResult.alreadyUnlocked
            ? 'You already have this agent unlocked'
            : 'Could not unlock agent'
      }
    });
  });

  /**
   * GET /ar/markers
   * Get all AR markers (Admin only)
   */
  getMarkers = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can view all markers');
    }

    const { active, limit, offset } = req.query;

    const markers = await prisma.aRMarker.findMany({
      where: active !== undefined ? { isActive: active === 'true' } : undefined,
      take: limit ? parseInt(limit as string) : 50,
      skip: offset ? parseInt(offset as string) : 0,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { scans: true }
        }
      }
    });

    res.json({
      success: true,
      data: markers
    });
  });

  /**
   * GET /ar/markers/:id
   * Get a specific marker (Admin only)
   */
  getMarker = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can view marker details');
    }

    const marker = await prisma.aRMarker.findUnique({
      where: { id: req.params.id },
      include: {
        scans: {
          take: 50,
          orderBy: { scannedAt: 'desc' },
          include: {
            user: {
              select: { id: true, fullName: true, email: true }
            }
          }
        },
        _count: {
          select: { scans: true }
        }
      }
    });

    if (!marker) {
      throw new NotFoundError('Marker not found');
    }

    res.json({
      success: true,
      data: marker
    });
  });

  /**
   * POST /ar/markers
   * Create a new AR marker (Admin only)
   */
  createMarker = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can create markers');
    }

    const validation = createMarkerSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    // Check if code already exists
    const existing = await prisma.aRMarker.findUnique({
      where: { codeContent: validation.data.codeContent }
    });

    if (existing) {
      throw new ValidationError('A marker with this code already exists');
    }

    const marker = await prisma.aRMarker.create({
      data: {
        codeContent: validation.data.codeContent,
        unlocksAgent: validation.data.unlocksAgent,
        loreText: validation.data.loreText,
        xpReward: validation.data.xpReward,
        isOneTime: validation.data.isOneTime,
        validFrom: validation.data.validFrom,
        validUntil: validation.data.validUntil,
        maxScans: validation.data.maxScans,
        locationData: validation.data.location ? JSON.stringify(validation.data.location) : null,
        createdBy: req.user!.userId
      }
    });

    res.status(201).json({
      success: true,
      message: 'Marker created',
      data: marker
    });
  });

  /**
   * PATCH /ar/markers/:id
   * Update an AR marker (Admin only)
   */
  updateMarker = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can update markers');
    }

    const validation = updateMarkerSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const marker = await prisma.aRMarker.update({
      where: { id: req.params.id },
      data: validation.data
    });

    res.json({
      success: true,
      message: 'Marker updated',
      data: marker
    });
  });

  /**
   * DELETE /ar/markers/:id
   * Delete an AR marker (Admin only)
   */
  deleteMarker = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can delete markers');
    }

    // Delete associated scans first
    await prisma.aRScan.deleteMany({
      where: { markerId: req.params.id }
    });

    await prisma.aRMarker.delete({
      where: { id: req.params.id }
    });

    res.json({
      success: true,
      message: 'Marker deleted'
    });
  });

  /**
   * GET /ar/scans
   * Get user's scan history
   */
  getUserScans = asyncHandler(async (req: Request, res: Response) => {
    const scans = await prisma.aRScan.findMany({
      where: { userId: req.user!.userId },
      orderBy: { scannedAt: 'desc' },
      include: {
        marker: {
          select: {
            unlocksAgent: true,
            loreText: true,
            xpReward: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: scans
    });
  });

  /**
   * GET /ar/unlockable
   * Get list of agents that can be unlocked via AR
   */
  getUnlockableAgents = asyncHandler(async (req: Request, res: Response) => {
    // Get user's career path to see what's already unlocked
    const careerPath = await prisma.careerPath.findUnique({
      where: { userId: req.user!.userId }
    });

    const unlockedNodes = careerPath?.unlockedNodes || [];

    // AR-unlockable agents
    const arAgents = [
      {
        agent: 'ORACLE',
        name: 'The Oracle',
        description: 'A mysterious agent with prophetic abilities',
        unlocked: unlockedNodes.includes('ORACLE'),
        hint: 'Seek wisdom in unexpected places'
      },
      {
        agent: 'ETHICIST',
        name: 'The Ethicist',
        description: 'Guardian of moral reasoning',
        unlocked: unlockedNodes.includes('ETHICIST'),
        hint: 'Find the hidden server room'
      }
    ];

    res.json({
      success: true,
      data: arAgents
    });
  });

  /**
   * GET /ar/stats
   * Get AR scanning statistics (Admin only)
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can view AR statistics');
    }

    const [totalMarkers, activeMarkers, totalScans, uniqueScanners] = await Promise.all([
      prisma.aRMarker.count(),
      prisma.aRMarker.count({ where: { isActive: true } }),
      prisma.aRScan.count(),
      prisma.aRScan.groupBy({
        by: ['userId'],
        _count: true
      })
    ]);

    // Most scanned markers
    const topMarkers = await prisma.aRMarker.findMany({
      orderBy: { scanCount: 'desc' },
      take: 10,
      select: {
        id: true,
        unlocksAgent: true,
        scanCount: true,
        createdAt: true
      }
    });

    // Recent scans
    const recentScans = await prisma.aRScan.findMany({
      orderBy: { scannedAt: 'desc' },
      take: 20,
      include: {
        user: { select: { id: true, fullName: true } },
        marker: { select: { unlocksAgent: true } }
      }
    });

    res.json({
      success: true,
      data: {
        totalMarkers,
        activeMarkers,
        totalScans,
        uniqueScanners: uniqueScanners.length,
        topMarkers,
        recentScans
      }
    });
  });
}

export const arController = new ARController();
