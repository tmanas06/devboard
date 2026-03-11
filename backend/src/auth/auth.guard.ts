import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  private clerk;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.clerk = createClerkClient({
      secretKey: this.configService.get('CLERK_SECRET_KEY'),
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Clerk's getToken() returns a JWT token
      // Decode it to get the user ID (sub claim)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid token format');
      }

      // Decode the JWT payload (base64url decode)
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString(),
      );

      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token: missing user ID');
      }

      // Get user details from Clerk
      const clerkUser = await this.clerk.users.getUser(payload.sub);

      if (!clerkUser) {
        throw new UnauthorizedException('User not found');
      }

      // Fetch user from database with organization memberships
      let user = await this.prisma.user.findUnique({
        where: { clerkId: clerkUser.id },
        include: {
          organizationMembers: {
            where: { isActive: true },
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  isActive: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        // Auto-create user if they don't exist in our DB but exist in Clerk
        user = await this.prisma.user.create({
          data: {
            clerkId: clerkUser.id,
            email: clerkUser.emailAddresses[0]?.emailAddress || '',
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
          },
          include: {
            organizationMembers: {
              where: { isActive: true },
              include: {
                organization: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        });
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User is inactive');
      }

      // Get organization context from header or use first active membership
      const requestedOrgId = request.headers['x-organization-id'] as string | undefined;
      
      let currentOrgId: string | null = null;
      let currentRole: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER' = 'MEMBER';

      const activeMemberships = user.organizationMembers.filter(
        (m) => m.organization.isActive,
      );

      if (activeMemberships.length === 0) {
        // User has no organization memberships - allow authentication but with no org context
        // They'll need to be added to an organization by an admin
        currentOrgId = null;
        currentRole = 'MEMBER';
      } else if (requestedOrgId) {
        // Find the requested organization membership
        const requestedMembership = activeMemberships.find(
          (m) => m.organizationId === requestedOrgId,
        );
        
        if (!requestedMembership) {
          // Client requested an org they are no longer a member of (or invalid)
          // Fall back to default instead of rejecting the entire request
          const defaultMembership = activeMemberships[0];
          currentOrgId = defaultMembership.organizationId;
          currentRole = defaultMembership.role as 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
        } else {
          currentOrgId = requestedOrgId;
          currentRole = requestedMembership.role as 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
        }
      } else {
        // Use first active membership as default
        const defaultMembership = activeMemberships[0];
        currentOrgId = defaultMembership.organizationId;
        currentRole = defaultMembership.role as 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
      }

      // Build organization memberships array
      const organizationMemberships = activeMemberships.map((m) => ({
        organizationId: m.organizationId,
        role: m.role as 'ADMIN' | 'ORG_ADMIN' | 'MEMBER',
      }));

      // Attach user to request with role and organization info
      request.user = {
        id: user.id,
        clerkId: user.clerkId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: currentRole,
        organizationId: currentOrgId || '',
        organizationMemberships,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      console.error('AuthGuard error:', error);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}
