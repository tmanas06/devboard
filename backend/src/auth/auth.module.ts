import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [AuthGuard, RolesGuard, ClerkAuthGuard],
  exports: [AuthGuard, RolesGuard, ClerkAuthGuard],
})
export class AuthModule {}
