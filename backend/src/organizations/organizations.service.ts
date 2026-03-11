import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrganizationsService {
  private clerk;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get('CLERK_SECRET_KEY'),
    });
  }

  async create(createOrganizationDto: CreateOrganizationDto, user: CurrentUserData) {
    // Users can create their own organizations

    // Check if slug already exists
    const existing = await this.prisma.organization.findUnique({
      where: { slug: createOrganizationDto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Create the organization
    const organization = await this.prisma.organization.create({
      data: createOrganizationDto,
    });

    // Create a user record for the org_admin in the new organization
    // Get the current user's Clerk data
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!currentUser) {
      throw new NotFoundException('Current user not found');
    }

    // Check if user already exists in this organization
    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: currentUser.id,
          organizationId: organization.id,
        },
      },
    });

    if (!existingMembership) {
      // Create organization membership for the org_admin
      await this.prisma.organizationMember.create({
        data: {
          userId: currentUser.id,
          organizationId: organization.id,
          role: 'ORG_ADMIN',
        },
      });
    } else if (!existingMembership.isActive) {
      // Reactivate existing membership
      await this.prisma.organizationMember.update({
        where: {
          userId_organizationId: {
            userId: currentUser.id,
            organizationId: organization.id,
          },
        },
        data: {
          isActive: true,
          role: 'ORG_ADMIN',
        },
      });
    }

    return organization;
  }

  async findAll(user?: CurrentUserData) {
    // If no user context (e.g. Onboarding), return all active organizations
    if (!user) {
      return this.prisma.organization.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // If ADMIN, return all active organizations
    if (user.role === 'ADMIN') {
      return this.prisma.organization.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              members: true,
              tasks: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Otherwise, return all active organizations so users can see "Available Networks" to join
    // But we should ensure permissions for specific nodes are checked in findOne
    return this.prisma.organization.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: CurrentUserData) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  // Onboarding-specific method to create organization without user context
  async createForOnboarding(createOrganizationDto: CreateOrganizationDto) {
    // Check if slug already exists
    const existing = await this.prisma.organization.findUnique({
      where: { slug: createOrganizationDto.slug },
    });

    if (existing) {
      throw new ConflictException('Organization with this slug already exists');
    }

    // Create the organization
    return this.prisma.organization.create({
      data: createOrganizationDto,
    });
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto, user: CurrentUserData) {
    await this.findOne(id, user);

    // Only ORG_ADMIN can update organizations (and only their own)
    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can update organizations');
    }

    // Check slug uniqueness if updating
    if (updateOrganizationDto.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: updateOrganizationDto.slug },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Organization with this slug already exists');
      }
    }

    return this.prisma.organization.update({
      where: { id },
      data: updateOrganizationDto,
    });
  }

  async remove(id: string, user: CurrentUserData) {
    await this.findOne(id, user);

    // Only ORG_ADMIN can delete organizations
    if (user.role !== 'ORG_ADMIN') {
      throw new ForbiddenException('Only organization admins can delete organizations');
    }

    return this.prisma.organization.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
