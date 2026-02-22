// Yokaizen Campus - Authentication Middleware
// JWT validation and role-based access control

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { JWTPayload, UserRole, APIResponse } from '../types/index.js';
import { prisma } from '../utils/prisma.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// Verify JWT token
export function authenticate(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'No token provided',
    });
    return;
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
      });
      return;
    }

    res.status(401).json({
      success: false,
      error: 'Invalid token',
    });
  }
}

// Optional authentication (doesn't fail if no token)
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    try {
      const payload = jwt.verify(token, config.jwt.secret) as JWTPayload;
      req.user = payload;
    } catch {
      // Token invalid, but we continue without user
    }
  }

  next();
}

// Role-based access control
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response<APIResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
}

// Verify user owns the resource
export function requireOwnership(resourceIdParam: string = 'userId') {
  return (req: Request, res: Response<APIResponse>, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const resourceId = req.params[resourceIdParam];

    // Admins can access any resource
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    if (req.user.userId !== resourceId) {
      res.status(403).json({
        success: false,
        error: 'You do not have access to this resource',
      });
      return;
    }

    next();
  };
}

// Verify user is in a classroom (as student or teacher)
export async function requireClassroomAccess(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const classroomId = req.params.id || req.params.classroomId || req.body.classroomId;

  if (!classroomId) {
    res.status(400).json({
      success: false,
      error: 'Classroom ID required',
    });
    return;
  }

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
      include: {
        students: {
          where: { studentId: req.user.userId },
        },
      },
    });

    if (!classroom) {
      res.status(404).json({
        success: false,
        error: 'Classroom not found',
      });
      return;
    }

    // Check if user is teacher or enrolled student
    const isTeacher = classroom.teacherId === req.user.userId;
    const isStudent = classroom.students.length > 0;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isTeacher && !isStudent && !isAdmin) {
      res.status(403).json({
        success: false,
        error: 'You do not have access to this classroom',
      });
      return;
    }

    // Attach classroom access info to request
    (req as Request & { classroomAccess?: { isTeacher: boolean; isStudent: boolean } }).classroomAccess = {
      isTeacher,
      isStudent,
    };

    next();
  } catch (error) {
    console.error('Classroom access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify classroom access',
    });
  }
}

// Require teacher role in specific classroom
export async function requireTeacher(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const classroomId = req.params.id || req.params.classroomId || req.body.classroomId;

  if (!classroomId) {
    res.status(400).json({
      success: false,
      error: 'Classroom ID required',
    });
    return;
  }

  try {
    const classroom = await prisma.classroom.findUnique({
      where: { id: classroomId },
    });

    if (!classroom) {
      res.status(404).json({
        success: false,
        error: 'Classroom not found',
      });
      return;
    }

    if (classroom.teacherId !== req.user.userId && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        error: 'Only the teacher can perform this action',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Teacher check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify teacher status',
    });
  }
}

// Parent access to child's data
export async function requireParentAccess(
  req: Request,
  res: Response<APIResponse>,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  const studentId = req.params.studentId;

  if (!studentId) {
    res.status(400).json({
      success: false,
      error: 'Student ID required',
    });
    return;
  }

  // Admins can access any student
  if (req.user.role === 'ADMIN') {
    next();
    return;
  }

  // Must be a parent
  if (req.user.role !== 'PARENT') {
    res.status(403).json({
      success: false,
      error: 'Parent role required',
    });
    return;
  }

  try {
    const parentChild = await prisma.parentChild.findFirst({
      where: {
        parentId: req.user.userId,
        childId: studentId,
        isVerified: true,
      },
    });

    if (!parentChild) {
      res.status(403).json({
        success: false,
        error: 'You do not have access to this student\'s data',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('Parent access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify parent access',
    });
  }
}

// Credit check middleware
export function requireCredits(minCredits: number) {
  return async (req: Request, res: Response<APIResponse>, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    // PRO users and NGO_GRANT have unlimited credits (checked elsewhere)
    if (req.user.tier !== 'FREE') {
      next();
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { credits: true },
      });

      if (!user || user.credits < minCredits) {
        res.status(402).json({
          success: false,
          error: 'Insufficient credits',
          message: `This action requires ${minCredits} credits. You have ${user?.credits || 0}.`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Credit check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify credits',
      });
    }
  };
}
