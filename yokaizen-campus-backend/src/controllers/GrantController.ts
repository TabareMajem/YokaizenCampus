import { Request, Response } from 'express';
import { z } from 'zod';
import { grantService } from '../services/GrantService';
import { asyncHandler, ValidationError, ForbiddenError } from '../middleware/errorHandler';

// Validation schemas
const applyGrantSchema = z.object({
  orgName: z.string().min(2, 'Organization name is required'),
  orgType: z.enum(['SCHOOL', 'NGO', 'NONPROFIT', 'GOVERNMENT', 'COMMUNITY']),
  contactEmail: z.string().email('Valid email is required'),
  contactName: z.string().min(2, 'Contact name is required'),
  contactPhone: z.string().optional(),
  region: z.string().min(2, 'Region is required'),
  country: z.string().min(2, 'Country is required'),
  description: z.string().min(50, 'Please provide a description of at least 50 characters'),
  studentCount: z.number().int().min(1, 'Student count must be at least 1'),
  useCase: z.string().min(20, 'Please describe your use case'),
  website: z.string().url().optional(),
  taxId: z.string().optional(),
  additionalInfo: z.string().optional()
});

const updateGrantSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  reviewNotes: z.string().optional(),
  creditAllocation: z.number().int().min(0).optional(),
  validUntil: z.string().datetime().optional()
});

const bulkUpdateSchema = z.object({
  grantIds: z.array(z.string().uuid()),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED']),
  reviewNotes: z.string().optional()
});

export class GrantController {
  /**
   * POST /ngo/apply
   * Submit a grant application
   */
  apply = asyncHandler(async (req: Request, res: Response) => {
    const validation = applyGrantSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const application = await grantService.submitApplication({
      ...validation.data,
      applicantId: req.user?.id
    });

    res.status(201).json({
      success: true,
      message: 'Grant application submitted successfully',
      data: application
    });
  });

  /**
   * GET /ngo/applications
   * Get grant applications (Admin: all, User: own)
   */
  getApplications = asyncHandler(async (req: Request, res: Response) => {
    const { status, region, limit, offset } = req.query;

    let applications;
    
    if (req.user!.role === 'ADMIN') {
      applications = await grantService.getAllApplications({
        status: status as string,
        region: region as string,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      });
    } else {
      applications = await grantService.getUserApplications(req.user!.id);
    }

    res.json({
      success: true,
      data: applications
    });
  });

  /**
   * GET /ngo/applications/:id
   * Get a specific grant application
   */
  getApplication = asyncHandler(async (req: Request, res: Response) => {
    const application = await grantService.getApplication(
      req.params.id,
      req.user!.id,
      req.user!.role === 'ADMIN'
    );

    res.json({
      success: true,
      data: application
    });
  });

  /**
   * PATCH /ngo/applications/:id
   * Update grant application status (Admin only)
   */
  updateApplication = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can update grant applications');
    }

    const validation = updateGrantSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const application = await grantService.updateApplication(
      req.params.id,
      req.user!.id,
      validation.data
    );

    res.json({
      success: true,
      message: 'Application updated',
      data: application
    });
  });

  /**
   * POST /ngo/applications/bulk-update
   * Bulk update grant applications (Admin only)
   */
  bulkUpdate = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can bulk update grant applications');
    }

    const validation = bulkUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      throw new ValidationError(validation.error.errors[0].message);
    }

    const result = await grantService.bulkUpdateApplications(
      validation.data.grantIds,
      validation.data.status,
      req.user!.id,
      validation.data.reviewNotes
    );

    res.json({
      success: true,
      message: `Updated ${result.updated} applications`,
      data: result
    });
  });

  /**
   * DELETE /ngo/applications/:id
   * Withdraw/delete a grant application
   */
  withdrawApplication = asyncHandler(async (req: Request, res: Response) => {
    await grantService.withdrawApplication(
      req.params.id,
      req.user!.id,
      req.user!.role === 'ADMIN'
    );

    res.json({
      success: true,
      message: 'Application withdrawn'
    });
  });

  /**
   * GET /ngo/stats
   * Get grant program statistics (Admin only)
   */
  getStats = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can view grant statistics');
    }

    const stats = await grantService.getStats();

    res.json({
      success: true,
      data: stats
    });
  });

  /**
   * POST /ngo/applications/:id/allocate
   * Allocate credits to an approved grant (Admin only)
   */
  allocateCredits = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can allocate grant credits');
    }

    const { credits, note } = req.body;

    if (!credits || credits < 1) {
      throw new ValidationError('Credits amount is required');
    }

    const result = await grantService.allocateCredits(
      req.params.id,
      credits,
      req.user!.id,
      note
    );

    res.json({
      success: true,
      message: `Allocated ${credits} credits`,
      data: result
    });
  });

  /**
   * GET /ngo/applications/:id/usage
   * Get credit usage for a grant
   */
  getUsage = asyncHandler(async (req: Request, res: Response) => {
    const usage = await grantService.getGrantUsage(
      req.params.id,
      req.user!.id,
      req.user!.role === 'ADMIN'
    );

    res.json({
      success: true,
      data: usage
    });
  });

  /**
   * POST /ngo/applications/:id/extend
   * Extend grant validity period (Admin only)
   */
  extendGrant = asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      throw new ForbiddenError('Only admins can extend grants');
    }

    const { months, reason } = req.body;

    if (!months || months < 1 || months > 24) {
      throw new ValidationError('Extension must be between 1 and 24 months');
    }

    const result = await grantService.extendGrant(
      req.params.id,
      months,
      req.user!.id,
      reason
    );

    res.json({
      success: true,
      message: `Grant extended by ${months} months`,
      data: result
    });
  });

  /**
   * GET /ngo/regions
   * Get list of supported regions
   */
  getRegions = asyncHandler(async (req: Request, res: Response) => {
    const regions = await grantService.getSupportedRegions();

    res.json({
      success: true,
      data: regions
    });
  });

  /**
   * POST /ngo/applications/:id/documents
   * Upload supporting documents
   */
  uploadDocuments = asyncHandler(async (req: Request, res: Response) => {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      throw new ValidationError('Documents array is required');
    }

    const result = await grantService.addDocuments(
      req.params.id,
      req.user!.id,
      documents
    );

    res.json({
      success: true,
      message: 'Documents uploaded',
      data: result
    });
  });

  /**
   * POST /ngo/applications/:id/message
   * Send a message regarding the application
   */
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const { message } = req.body;

    if (!message || message.length < 10) {
      throw new ValidationError('Message must be at least 10 characters');
    }

    const result = await grantService.addMessage(
      req.params.id,
      req.user!.id,
      message,
      req.user!.role === 'ADMIN'
    );

    res.json({
      success: true,
      message: 'Message sent',
      data: result
    });
  });

  /**
   * GET /ngo/applications/:id/messages
   * Get messages for an application
   */
  getMessages = asyncHandler(async (req: Request, res: Response) => {
    const messages = await grantService.getMessages(
      req.params.id,
      req.user!.id,
      req.user!.role === 'ADMIN'
    );

    res.json({
      success: true,
      data: messages
    });
  });
}

export const grantController = new GrantController();
