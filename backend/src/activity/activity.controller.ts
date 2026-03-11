import { Controller, Get, Query, UseGuards, Res, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ActivityService } from './activity.service';
import { QueryActivityDto } from './dto/query-activity.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';

@ApiTags('Activity')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('activity')
export class ActivityController {
    constructor(private readonly activityService: ActivityService) { }

    @Get()
    @ApiOperation({ summary: 'Get activity feed with filters and pagination' })
    @ApiResponse({ status: 200, description: 'Paginated activity log' })
    findAll(@Query() query: QueryActivityDto, @CurrentUser() user: CurrentUserData) {
        return this.activityService.findAll(query, user);
    }

    @Get('export')
    @ApiOperation({ summary: 'Export activity log as CSV' })
    @ApiResponse({ status: 200, description: 'CSV file download' })
    async exportCsv(
        @Query() query: QueryActivityDto,
        @CurrentUser() user: CurrentUserData,
        @Res() res: Response,
    ) {
        const csv = await this.activityService.exportCsv(query, user);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=activity-log-${Date.now()}.csv`);
        res.send(csv);
    }
}
