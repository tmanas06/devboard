import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('check')
  @ApiOperation({ summary: 'Check if user needs onboarding' })
  @ApiResponse({ status: 200, description: 'Returns whether user exists in database' })
  async checkOnboardingStatus(@Req() req: any) {
    return this.onboardingService.checkOnboardingStatus(req.clerkUserId);
  }

  @Get('organizations')
  @ApiOperation({ summary: 'Get list of organizations for joining' })
  @ApiResponse({ status: 200, description: 'List of active organizations' })
  async getOrganizations() {
    return this.onboardingService.getOrganizations();
  }

  @Post('complete')
  @ApiOperation({ summary: 'Complete onboarding and create user in database' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid onboarding data' })
  async completeOnboarding(
    @Req() req: any,
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ) {
    return this.onboardingService.completeOnboarding(
      req.clerkUserId,
      completeOnboardingDto,
    );
  }
}
