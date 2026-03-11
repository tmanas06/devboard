import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { AuthModule } from '../auth/auth.module';
import { OrganizationsModule } from '../organizations/organizations.module';

@Module({
  imports: [AuthModule, OrganizationsModule],
  controllers: [UsersController, OnboardingController],
  providers: [UsersService, OnboardingService],
  exports: [UsersService, OnboardingService],
})
export class UsersModule {}
