import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  private clerkClient;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.clerkClient = createClerkClient({
      secretKey: this.configService.get('CLERK_SECRET_KEY'),
    });
  }

  async syncUserFromClerk(clerkUser: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }, organizationId: string) {
    // Upsert user from Clerk data
    const user = await this.prisma.user.upsert({
      where: { clerkId: clerkUser.id },
      update: {
        email: clerkUser.email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
      create: {
        clerkId: clerkUser.id,
        email: clerkUser.email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      },
    });

    // Ensure organization membership exists
    await this.prisma.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      update: {
        isActive: true,
      },
      create: {
        userId: user.id,
        organizationId,
        role: 'MEMBER',
      },
    });

    return user;
  }

  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizationMembers: {
          where: { isActive: true },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizations: user.organizationMembers.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update local database
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        email: updateUserDto.email,
      },
    });

    // Sync with Clerk
    try {
      await this.clerkClient.users.updateUser(user.clerkId, {
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
      });
    } catch (error) {
      console.error('Failed to sync with Clerk:', error);
    }

    return updatedUser;
  }

  async findAll(organizationId: string, user: CurrentUserData) {
    // ADMIN can access all organizations
    if (user.role !== 'ADMIN') {
      const isMember = user.organizationMemberships.some(m => m.organizationId === organizationId);
      if (!isMember) {
        throw new ForbiddenException('You can only access users from organizations you belong to');
      }
    }

    // Get all users who are members of this organization
    const members = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
            _count: {
              select: {
                assignedTasks: true,
                timeEntries: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((m) => ({
      id: m.user.id,
      clerkId: m.user.clerkId,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      createdAt: m.user.createdAt,
      _count: m.user._count,
    }));
  }

  async findOne(id: string, user: CurrentUserData) {
    const foundUser = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organizationMembers: {
          where: { isActive: true },
          include: {
            organization: true,
          },
        },
        _count: {
          select: {
            assignedTasks: true,
            timeEntries: true,
          },
        },
      },
    });

    if (!foundUser || !foundUser.isActive) {
      throw new NotFoundException('User not found');
    }

    // Check access based on role - user must share an organization
    const hasSharedOrg = foundUser.organizationMembers.some(
      (m) => user.organizationMemberships.some(um => um.organizationId === m.organizationId),
    );

    if (user.role !== 'ADMIN' && !hasSharedOrg) {
      throw new ForbiddenException('You can only access users from organizations you belong to');
    }

    return {
      ...foundUser,
      organizations: foundUser.organizationMembers.map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
        role: m.role,
      })),
    };
  }

  async joinOrganization(userId: string, organizationId: string, role: 'ORG_ADMIN' | 'MEMBER' = 'MEMBER') {
    // Verify organization exists and is active
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || !organization.isActive) {
      throw new NotFoundException('Organization not found or inactive');
    }

    // Check if user already has membership
    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (existingMembership) {
      if (existingMembership.isActive) {
        throw new ConflictException('User is already a member of this organization');
      } else {
        // Reactivate membership
        return this.prisma.organizationMember.update({
          where: {
            userId_organizationId: {
              userId,
              organizationId,
            },
          },
          data: {
            isActive: true,
            role,
          },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });
      }
    }

    // Create new membership
    return this.prisma.organizationMember.create({
      data: {
        userId,
        organizationId,
        role,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async leaveOrganization(userId: string, organizationId: string) {
    const existingMembership = await this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });

    if (!existingMembership || !existingMembership.isActive) {
      throw new NotFoundException('Not a member of this organization');
    }

    // Soft-leave by marking membership inactive
    return this.prisma.organizationMember.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: {
        isActive: false,
      },
    });
  }
}
