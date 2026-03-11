import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { ExportTimeEntriesDto } from './dto/export-time-entries.dto';
import { BulkDeleteTimeEntriesDto } from './dto/bulk-time-entries.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Time Entries')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) { }

  @Post()
  @ApiOperation({ summary: 'Create a new time entry' })
  @ApiResponse({ status: 201, description: 'Time entry created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid time range' })
  create(@Body() createTimeEntryDto: CreateTimeEntryDto, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.create(createTimeEntryDto, user);
  }

  @Post('bulk-delete')
  @ApiOperation({ summary: 'Bulk delete time entries' })
  @ApiResponse({ status: 200, description: 'Time entries deleted successfully' })
  bulkDelete(@Body() dto: BulkDeleteTimeEntriesDto, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.bulkRemove(dto.ids, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all time entries with filters' })
  @ApiResponse({ status: 200, description: 'List of time entries' })
  findAll(@Query() query: QueryTimeEntriesDto, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.findAll(query, user);
  }

  @Get('reports/summary')
  @ApiOperation({ summary: 'Get time summary report' })
  @ApiResponse({ status: 200, description: 'Time summary aggregated by user and task' })
  getTimeSummary(@Query() query: QueryTimeEntriesDto, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.getTimeSummary(query, user);
  }

  @Get('reports/export')
  @ApiOperation({ summary: 'Export time entries to CSV or PDF' })
  @ApiResponse({ status: 200, description: 'Exported file' })
  async exportTimeEntries(
    @Query() query: ExportTimeEntriesDto,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    const result = await this.timeEntriesService.exportTimeEntries(query, user);
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.data);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get time entry by ID' })
  @ApiResponse({ status: 200, description: 'Time entry details' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update time entry' })
  @ApiResponse({ status: 200, description: 'Time entry updated successfully' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  update(
    @Param('id') id: string,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.timeEntriesService.update(id, updateTimeEntryDto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete time entry' })
  @ApiResponse({ status: 200, description: 'Time entry deleted successfully' })
  @ApiResponse({ status: 404, description: 'Time entry not found' })
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserData) {
    return this.timeEntriesService.remove(id, user);
  }
}
