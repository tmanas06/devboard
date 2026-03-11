import { Controller, Get, Param, Post, Patch, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JoinOrganizationDto } from './dto/join-organization.dto';
import { LeaveOrganizationDto } from './dto/leave-organization.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get('me')
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ status: 200, description: 'Current user details' })
  async getCurrentUser(@CurrentUser() user: CurrentUserData) {
    const userData = await this.usersService.getCurrentUser(user.id);
    return {
      ...userData,
      role: user.role,
      organizationId: user.organizationId,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateProfile(@Body() updateUserDto: UpdateUserDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.updateProfile(user.id, updateUserDto);
  }

  @Post('join-organization')
  @ApiOperation({ summary: 'Join an organization' })
  @ApiResponse({ status: 201, description: 'Successfully joined organization' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 409, description: 'Already a member of this organization' })
  joinOrganization(@Body() joinOrganizationDto: JoinOrganizationDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.joinOrganization(
      user.id,
      joinOrganizationDto.organizationId,
      joinOrganizationDto.role || 'MEMBER',
    );
  }

  @Post('leave-organization')
  @ApiOperation({ summary: 'Leave an organization' })
  @ApiResponse({ status: 200, description: 'Successfully left organization' })
  @ApiResponse({ status: 404, description: 'Not a member of this organization' })
  leaveOrganization(@Body() leaveOrganizationDto: LeaveOrganizationDto, @CurrentUser() user: CurrentUserData) {
    return this.usersService.leaveOrganization(user.id, leaveOrganizationDto.organizationId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users in an organization' })
  @ApiQuery({ name: 'organizationId', required: true })
  @ApiResponse({ status: 200, description: 'List of users' })
  findAll(@Query('organizationId') organizationId: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.findAll(organizationId, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.usersService.findOne(id, user);
  }
}
