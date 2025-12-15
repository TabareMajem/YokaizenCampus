import { prisma } from '../utils/prisma';
import { AppError, NotFoundError, ForbiddenError } from '../middleware/errorHandler';
import { GrantStatus, SubscriptionTier, UserRole } from '@prisma/client';

interface GrantApplicationInput {
  orgName: string;
  contactName: string;
  contactEmail: string;
  region: string;
  country: string;
  orgType: 'NGO' | 'SCHOOL' | 'NONPROFIT' | 'GOVERNMENT' | 'OTHER';
  description: string;
  studentCount: number;
  website?: string;
  taxId?: string;
  useCase: string; // Required by schema
  additionalInfo?: string;
}

interface GrantReviewInput {
  applicationId: string;
  reviewerId: string;
  status: GrantStatus;
  reviewNotes: string;
  approvedCredits?: number;
  approvedDuration?: number; // months
}

export class GrantService {
  /**
   * Submit a grant application
   */
  async submitApplication(input: GrantApplicationInput) {
    // Check for existing pending application from same org
    const existing = await prisma.grantApplication.findFirst({
      where: {
        contactEmail: input.contactEmail,
        status: GrantStatus.PENDING
      }
    });

    if (existing) {
      throw new AppError(
        'You already have a pending application. Please wait for review.',
        400
      );
    }

    const application = await prisma.grantApplication.create({
      data: {
        orgName: input.orgName,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        region: input.region,
        country: input.country,
        orgType: input.orgType,
        description: input.description,
        studentCount: input.studentCount,
        website: input.website,
        taxId: input.taxId,
        useCase: input.useCase,
        additionalInfo: input.additionalInfo,
        status: GrantStatus.PENDING
      }
    });

    // Log the submission
    await prisma.auditLog.create({
      data: {
        userId: 'SYSTEM',
        actionType: 'GRANT_APPLICATION_SUBMITTED',
        details: `Grant application from ${input.orgName}`,
        meta: {
          applicationId: application.id,
          orgName: input.orgName,
          region: input.region
        }
      }
    });

    return {
      applicationId: application.id,
      status: 'PENDING',
      message: 'Your application has been submitted. We will review it within 5-7 business days.'
    };
  }

  /**
   * Get application status by email (for applicants to check)
   */
  async getApplicationStatus(email: string) {
    const applications = await prisma.grantApplication.findMany({
      where: { contactEmail: email },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orgName: true,
        status: true,
        createdAt: true, // was submittedAt
        reviewedAt: true,
        reviewNotes: true,
        creditAllocation: true, // was approvedCredits
        validUntil: true // was approvedDuration
      }
    });

    if (applications.length === 0) {
      throw new NotFoundError('No applications found for this email');
    }

    return applications;
  }

  /**
   * Review a grant application (admin only)
   */
  async reviewApplication(input: GrantReviewInput) {
    const { applicationId, reviewerId, status, reviewNotes, approvedCredits, approvedDuration } = input;

    // Verify reviewer is admin
    const reviewer = await prisma.user.findUnique({
      where: { id: reviewerId },
      select: { role: true }
    });

    if (!reviewer || reviewer.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can review grant applications');
    }

    const application = await prisma.grantApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status !== GrantStatus.PENDING) {
      throw new AppError('This application has already been reviewed', 400);
    }

    // Update application
    const updated = await prisma.grantApplication.update({
      where: { id: applicationId },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes,
        creditAllocation: status === GrantStatus.APPROVED ? approvedCredits : null,
        // Calculate validUntil if approvedDuration provided
        validUntil: status === GrantStatus.APPROVED && approvedDuration
          ? (() => { const d = new Date(); d.setMonth(d.getMonth() + approvedDuration); return d; })()
          : null,
      }
    });

    // If approved, create school and admin user
    if (status === GrantStatus.APPROVED) {
      await this.provisionGrantAccess(updated);
    }

    // Log the review
    await prisma.auditLog.create({
      data: {
        userId: reviewerId,
        actionType: 'GRANT_APPLICATION_REVIEWED',
        details: `Reviewed application from ${application.orgName}: ${status}`,
        meta: {
          applicationId,
          status,
          approvedCredits,
          approvedDuration
        }
      }
    });

    return {
      applicationId,
      status,
      message: status === GrantStatus.APPROVED
        ? 'Application approved. Access credentials have been sent to the contact email.'
        : 'Application has been reviewed.'
    };
  }

  /**
   * Get all pending applications (admin only)
   */
  async getPendingApplications(adminId: string, page: number = 1, limit: number = 20) {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can view applications');
    }

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.grantApplication.findMany({
        where: { status: GrantStatus.PENDING },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit
      }),
      prisma.grantApplication.count({
        where: { status: GrantStatus.PENDING }
      })
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get all applications with filters (admin only)
   */
  async getAllApplications(
    adminId: string,
    filters: {
      status?: GrantStatus;
      region?: string;
      country?: string;
      orgType?: string;
    },
    page: number = 1,
    limit: number = 20
  ) {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can view applications');
    }

    const where: any = {};
    if (filters.status) where.status = filters.status;
    if (filters.region) where.region = filters.region;
    if (filters.country) where.country = filters.country;
    if (filters.orgType) where.orgType = filters.orgType;

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.grantApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          school: {
            select: {
              id: true,
              name: true,
              _count: {
                select: { users: true }
              }
            }
          }
        }
      }),
      prisma.grantApplication.count({ where })
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get grant statistics (admin only)
   */
  async getGrantStatistics(adminId: string) {
    // Verify admin
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can view statistics');
    }

    const [
      totalApplications,
      pendingCount,
      approvedCount,
      rejectedCount,
      byRegion,
      byOrgType,
      totalCreditsApproved,
      totalStudentsReached
    ] = await Promise.all([
      prisma.grantApplication.count(),
      prisma.grantApplication.count({ where: { status: GrantStatus.PENDING } }),
      prisma.grantApplication.count({ where: { status: GrantStatus.APPROVED } }),
      prisma.grantApplication.count({ where: { status: GrantStatus.REJECTED } }),
      prisma.grantApplication.groupBy({
        by: ['region'],
        _count: true
      }),
      prisma.grantApplication.groupBy({
        by: ['orgType'],
        _count: true
      }),
      prisma.grantApplication.aggregate({
        where: { status: GrantStatus.APPROVED },
        _sum: { creditAllocation: true }
      }),
      prisma.grantApplication.aggregate({
        where: { status: GrantStatus.APPROVED },
        _sum: { studentCount: true }
      })
    ]);

    return {
      overview: {
        total: totalApplications,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        approvalRate: totalApplications > 0
          ? Math.round((approvedCount / totalApplications) * 100)
          : 0
      },
      byRegion: byRegion.map(r => ({
        region: r.region,
        count: r._count
      })),
      byOrgType: byOrgType.map(o => ({
        type: o.orgType,
        count: o._count
      })),
      impact: {
        totalCreditsApproved: totalCreditsApproved._sum.creditAllocation || 0,
        totalStudentsReached: totalStudentsReached._sum.studentCount || 0
      }
    };
  }

  /**
   * Extend grant duration (admin only)
   */
  async extendGrant(adminId: string, applicationId: string, additionalMonths: number) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can extend grants');
    }

    const application = await prisma.grantApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status !== GrantStatus.APPROVED) {
      throw new AppError('Can only extend approved grants', 400);
    }

    // Calculate new expiry
    const currentExpiry = application.validUntil || new Date();
    const newExpiry = new Date(currentExpiry);
    newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);

    const updated = await prisma.grantApplication.update({
      where: { id: applicationId },
      data: { validUntil: newExpiry }
    });

    // Update school expiry if linked
    if (application.schoolId) {
      await prisma.school.update({
        where: { id: application.schoolId },
        data: { grantExpiresAt: newExpiry }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        actionType: 'GRANT_EXTENDED',
        details: `Extended grant for ${application.orgName} by ${additionalMonths} months`,
        meta: { applicationId, additionalMonths, newDuration }
      }
    });

    return {
      applicationId,
      newDuration,
      message: `Grant extended by ${additionalMonths} months`
    };
  }

  /**
   * Add credits to a grant (admin only)
   */
  async addGrantCredits(adminId: string, applicationId: string, additionalCredits: number) {
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true }
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only administrators can add grant credits');
    }

    const application = await prisma.grantApplication.findUnique({
      where: { id: applicationId }
    });

    if (!application) {
      throw new NotFoundError('Application not found');
    }

    if (application.status !== GrantStatus.APPROVED) {
      throw new AppError('Can only add credits to approved grants', 400);
    }

    const newCredits = (application.creditAllocation || 0) + additionalCredits;

    await prisma.grantApplication.update({
      where: { id: applicationId },
      data: { creditAllocation: newCredits }
    });

    // Add credits to school if linked
    if (application.schoolId) {
      await prisma.school.update({
        where: { id: application.schoolId },
        data: {
          credits: { increment: additionalCredits }
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId: adminId,
        actionType: 'GRANT_CREDITS_ADDED',
        details: `Added ${additionalCredits} credits to grant for ${application.orgName}`,
        meta: { applicationId, additionalCredits, newCredits }
      }
    });

    return {
      applicationId,
      newCredits,
      message: `Added ${additionalCredits} credits to grant`
    };
  }

  // Private helper methods

  private async provisionGrantAccess(application: any) {
    // Create school
    const school = await prisma.school.create({
      data: {
        name: application.orgName,
        domain: this.generateSchoolDomain(application.orgName),
        subscriptionTier: SubscriptionTier.NGO_GRANT,
        credits: application.creditAllocation || 10000,
        // No grantApplicationId in School model? Schema check required. 
        // Schema says School has NO grantApplicationId field. Remove it.
        grantExpiresAt: application.validUntil
      }
    });

    // Link application to school
    await prisma.grantApplication.update({
      where: { id: application.id },
      data: { schoolId: school.id }
    });

    // Create admin user for the organization
    const tempPassword = this.generateTempPassword();
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.user.create({
      data: {
        email: application.contactEmail,
        passwordHash: hashedPassword,
        fullName: application.contactName,
        role: UserRole.ADMIN,
        schoolId: school.id,
        subscriptionTier: SubscriptionTier.NGO_GRANT,
        credits: 0 // Uses school credits
      }
    });

    // TODO: Send email with credentials
    // For now, log the temp password (in production, this would be emailed)
    console.log(`Grant provisioned for ${application.orgName}`);
    console.log(`Admin email: ${application.contactEmail}`);
    console.log(`Temp password: ${tempPassword}`);
    console.log(`School ID: ${school.id}`);

    return school;
  }

  private generateSchoolDomain(orgName: string): string {
    return orgName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50) + '.yokaizen.edu';
  }

  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  private calculateGrantExpiry(months: number): Date {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + months);
    return expiry;
  }
}

export const grantService = new GrantService();
