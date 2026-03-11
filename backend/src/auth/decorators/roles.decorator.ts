import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: ('ADMIN' | 'ORG_ADMIN' | 'MEMBER')[]) =>
  SetMetadata(ROLES_KEY, roles);

