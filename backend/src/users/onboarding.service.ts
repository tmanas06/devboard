import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { OrganizationsService } from '../organizations/organizations.service';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OnboardingService {
  private clerk;

  constructor(
    private prisma: PrismaService,
    private organizationsService: OrganizationsService,
    private configService: ConfigService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get('CLERK_SECRET_KEY'),
    });
  }

  async getOrganizations() {
    return this.organizationsService.findAll();
  }

  async checkOnboardingStatus(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
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

    return {
      needsOnboarding: !user,
      user: user
        ? {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            organizations: user.organizationMembers.map((m) => ({
              id: m.organization.id,
              name: m.organization.name,
              slug: m.organization.slug,
              role: m.role,
            })),
          }
        : null,
    };
  }

  async completeOnboarding(
    clerkId: string,
    completeOnboardingDto: CompleteOnboardingDto,
  ) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    if (existingUser) {
      throw new ConflictException('User already exists in database');
    }

    // Get Clerk user data
    const clerkUser = await this.clerk.users.getUser(clerkId);
    if (!clerkUser) {
      throw new NotFoundException('Clerk user not found');
    }

    // Create user in database (without organization membership)
    const user = await this.prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: completeOnboardingDto.firstName || clerkUser.firstName,
        lastName: completeOnboardingDto.lastName || clerkUser.lastName,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}

