import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface OrganizationMemberData {
  organizationId: string;
  role: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
}

export interface CurrentUserData {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'ADMIN' | 'ORG_ADMIN' | 'MEMBER';
  organizationId: string; // Current organization context
  organizationMemberships: OrganizationMemberData[]; // All organization memberships
}

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
