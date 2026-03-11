import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private clerk;

  constructor(private configService: ConfigService) {
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
      // We can decode it to get the user ID (sub claim)
      // Then fetch the user from Clerk to verify they exist
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

      // Get user details from Clerk to verify they exist
      const clerkUser = await this.clerk.users.getUser(payload.sub);

      if (!clerkUser) {
        throw new UnauthorizedException('User not found');
      }

      // Attach Clerk user ID to request (user may not exist in DB yet)
      request.clerkUserId = clerkUser.id;
      request.clerkUser = {
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('ClerkAuthGuard error:', error);
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

