import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Organizations')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Initialize a new Network Node (Organization) (ORG_ADMIN only)' })
  @ApiResponse({ status: 201, description: 'Node initialized successfully' })
  @ApiResponse({ status: 409, description: 'Node slug already in use' })
  create(@Body() createOrganizationDto: CreateOrganizationDto, @CurrentUser() user: CurrentUserData) {
    return this.organizationsService.create(createOrganizationDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all Network Nodes (Organizations)' })
  @ApiResponse({ status: 200, description: 'List of connected nodes' })
  findAll(@CurrentUser() user: CurrentUserData) {
    return this.organizationsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Network Node by ID' })
  @ApiResponse({ status: 200, description: 'Node parameters' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.organizationsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Network Node configuration' })
  @ApiResponse({ status: 200, description: 'Node updated successfully' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate / Soft delete Network Node' })
  @ApiResponse({ status: 200, description: 'Node deactivated successfully' })
  @ApiResponse({ status: 404, description: 'Node not found' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.organizationsService.remove(id, user);
  }
}
