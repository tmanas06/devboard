import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { QueryTimeEntriesDto } from './dto/query-time-entries.dto';
import { ExportTimeEntriesDto, ExportFormat } from './dto/export-time-entries.dto';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class TimeEntriesService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) { }

  async create(createTimeEntryDto: CreateTimeEntryDto, user: CurrentUserData) {
    const { taskIds, ...entryData } = createTimeEntryDto;

    // We will validate after determining organizationId and userId

    // Determine organizationId and userId based on user role
    let organizationId: string;
    let userId: string;

    // Members can only create entries for themselves
    if (user.role === 'MEMBER') {
      if (createTimeEntryDto.userId && createTimeEntryDto.userId !== user.id) {
        throw new ForbiddenException('You can only create time entries for yourself');
      }
      // Automatically set userId and organizationId for members
      userId = user.id;
      organizationId = user.organizationId;
    } else if (user.role === 'ORG_ADMIN') {
      // OrgAdmins can only create entries for their organization
      if (createTimeEntryDto.organizationId && createTimeEntryDto.organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only create time entries for your organization');
      }
      // If organizationId not provided, use user's organization
      organizationId = createTimeEntryDto.organizationId || user.organizationId;
      // If userId not provided, default to the org admin's own userId
      userId = createTimeEntryDto.userId || user.id;
    } else {
      // ADMIN can create entries for any organization/user
      if (!createTimeEntryDto.organizationId) {
        throw new BadRequestException('organizationId is required');
      }
      if (!createTimeEntryDto.userId) {
        throw new BadRequestException('userId is required');
      }
      organizationId = createTimeEntryDto.organizationId;
      userId = createTimeEntryDto.userId;
    }

    // Validate tasks if provided
    if (taskIds && taskIds.length > 0) {
      const tasks = await this.prisma.task.findMany({
        where: {
          id: { in: taskIds },
          organizationId,
          isActive: true,
        },
      });

      if (tasks.length !== taskIds.length) {
        throw new BadRequestException('One or more tasks not found or do not belong to the organization');
      }
    }

    // Final validation for time range, duration, and overlaps
    const validatedData = await this.validateTimeEntry(
      organizationId,
      userId,
      entryData.startTime,
      entryData.endTime,
    );

    return this.prisma.timeEntry.create({
      data: {
        organizationId,
        userId,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        hours: validatedData.hours,
        description: entryData.description,
        isBillable: entryData.isBillable,
        ...(taskIds && taskIds.length > 0 && {
          tasks: {
            connect: taskIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    }).then(async (entry) => {
      await this.activityService.log({
        organizationId,
        userId,
        action: 'TIME_ENTRY_CREATED',
        entityType: 'TIME_ENTRY',
        entityId: entry.id,
        metadata: { hours: entry.hours, description: entry.description },
      });
      return entry;
    });
  }

  async findAll(query: QueryTimeEntriesDto, user: CurrentUserData) {
    const where = this.getWhereClause(query, user);

    const { page = 1, limit: rawLimit = 10 } = query;
    const limit = Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.timeEntry.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timeEntry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getWhereClause(query: QueryTimeEntriesDto, user: CurrentUserData) {
    const { organizationId, userIds, taskId, startDate, endDate } = query;
    const where: any = {};

    if (user.role === 'ADMIN') {
      if (organizationId) {
        where.organizationId = organizationId;
      }
    } else if (user.role === 'ORG_ADMIN') {
      where.organizationId = user.organizationId;
      if (organizationId && organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only access entries from your organization');
      }
    } else {
      where.userId = user.id;
      where.organizationId = user.organizationId;
      if (userIds && userIds.length > 0) {
        const hasOtherUser = userIds.some(id => id !== user.id);
        if (hasOtherUser) {
          throw new ForbiddenException('You can only access your own time entries');
        }
      }
      if (organizationId && organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only access entries from your organization');
      }
    }

    if (userIds && userIds.length > 0 && user.role !== 'MEMBER') {
      where.userId = { in: userIds };
    }
    if (taskId) {
      where.tasks = { some: { id: taskId } };
    }
    if (startDate) {
      where.startTime = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.endTime = { lte: new Date(endDate) };
    }

    return where;
  }

  async findOne(id: string, user: CurrentUserData) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Check access based on role
    if (user.role === 'MEMBER' && timeEntry.userId !== user.id) {
      throw new ForbiddenException('You can only access your own time entries');
    }
    if (user.role === 'ORG_ADMIN' && timeEntry.organizationId !== user.organizationId) {
      throw new ForbiddenException('You can only access entries from your organization');
    }
    // ADMIN can access all entries

    return timeEntry;
  }

  async update(id: string, updateTimeEntryDto: UpdateTimeEntryDto, user: CurrentUserData) {
    const timeEntry = await this.findOne(id, user);

    const { taskIds, ...entryData } = updateTimeEntryDto;

    // Members can only update their own entries
    if (user.role === 'MEMBER' && timeEntry.userId !== user.id) {
      throw new ForbiddenException('You can only update your own time entries');
    }

    // Final validation for time range, duration, and overlaps if times are being updated
    const updatedStartTime = updateTimeEntryDto.startTime || timeEntry.startTime.toISOString();
    const updatedEndTime = updateTimeEntryDto.endTime || timeEntry.endTime.toISOString();

    // Validate tasks if provided
    if (taskIds !== undefined && taskIds.length > 0) {
      const tasks = await this.prisma.task.findMany({
        where: {
          id: { in: taskIds },
          organizationId: timeEntry.organizationId,
          isActive: true,
        },
      });

      if (tasks.length !== taskIds.length) {
        throw new BadRequestException('One or more tasks not found or do not belong to the organization');
      }
    }

    // Always validate on update to prevent overlaps and check duration
    const validatedData = await this.validateTimeEntry(
      timeEntry.organizationId,
      timeEntry.userId,
      updatedStartTime,
      updatedEndTime,
      id,
    );

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        ...entryData,
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        hours: validatedData.hours,
        ...(taskIds !== undefined && {
          tasks: {
            set: taskIds.length > 0
              ? taskIds.map((taskId) => ({ id: taskId }))
              : [],
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });
  }

  async remove(id: string, user: CurrentUserData) {
    const timeEntry = await this.findOne(id, user);

    // Members can only delete their own entries
    if (user.role === 'MEMBER' && timeEntry.userId !== user.id) {
      throw new ForbiddenException('You can only delete your own time entries');
    }

    const result = await this.prisma.timeEntry.delete({
      where: { id },
    });

    await this.activityService.log({
      organizationId: timeEntry.organizationId,
      userId: user.id,
      action: 'TIME_ENTRY_DELETED',
      entityType: 'TIME_ENTRY',
      entityId: id,
      metadata: { hours: timeEntry.hours },
    });

    return result;
  }

  // ─── Bulk operations ───────────────────────────────────────────────

  async bulkRemove(ids: string[], user: CurrentUserData) {
    const entries = await this.prisma.timeEntry.findMany({
      where: { id: { in: ids } },
    });

    if (entries.length !== ids.length) {
      throw new NotFoundException('One or more time entries not found');
    }

    if (user.role === 'MEMBER') {
      const notOwned = entries.filter((e) => e.userId !== user.id);
      if (notOwned.length > 0) {
        throw new ForbiddenException('You can only delete your own time entries');
      }
    } else if (user.role === 'ORG_ADMIN') {
      const unauthorized = entries.filter((e) => e.organizationId !== user.organizationId);
      if (unauthorized.length > 0) {
        throw new ForbiddenException('You can only delete entries from your organization');
      }
    }

    const result = await this.prisma.timeEntry.deleteMany({
      where: { id: { in: ids } },
    });

    await this.activityService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'TIME_ENTRY_BULK_DELETED',
      entityType: 'TIME_ENTRY',
      metadata: { count: ids.length },
    });

    return result;
  }

  // Reports endpoint
  async getTimeSummary(query: QueryTimeEntriesDto, user: CurrentUserData) {
    const { organizationId, userIds, taskId, startDate, endDate } = query;

    // Build where clause based on user role
    const where: any = {};

    // ADMIN can access all organizations
    if (user.role === 'ADMIN') {
      if (organizationId) {
        where.organizationId = organizationId;
      }
    } else if (user.role === 'ORG_ADMIN') {
      // OrgAdmin can only see entries in their organization
      where.organizationId = user.organizationId;
      if (organizationId && organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only access entries from your organization');
      }
    } else {
      // MEMBER can only see their own entries
      where.userId = user.id;
      where.organizationId = user.organizationId;
      if (userIds && userIds.length > 0 && !userIds.includes(user.id)) {
        throw new ForbiddenException('You can only access your own time entries');
      }
      if (organizationId && organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only access entries from your organization');
      }
    }

    // Apply additional filters
    if (userIds && userIds.length > 0 && user.role !== 'MEMBER') {
      where.userId = { in: userIds };
    }
    if (taskId) {
      where.tasks = {
        some: {
          id: taskId,
        },
      };
    }
    if (startDate) {
      where.startTime = {
        gte: new Date(startDate),
      };
    }
    if (endDate) {
      where.endTime = {
        lte: new Date(endDate),
      };
    }

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Aggregate totals
    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

    // Group by user
    const byUser = entries.reduce((acc, entry) => {
      const key = entry.userId;
      if (!acc[key]) {
        acc[key] = {
          user: entry.user,
          totalHours: 0,
          entriesCount: 0,
        };
      }
      acc[key].totalHours += entry.hours;
      acc[key].entriesCount += 1;
      return acc;
    }, {});

    // Group by task
    const byTask = entries.reduce((acc, entry) => {
      entry.tasks.forEach((task) => {
        const key = task.id;
        if (!acc[key]) {
          acc[key] = {
            task,
            totalHours: 0,
            entriesCount: 0,
          };
        }
        acc[key].totalHours += entry.hours;
        acc[key].entriesCount += 1;
      });
      return acc;
    }, {});

    return {
      summary: {
        totalHours,
        entriesCount: entries.length,
      },
      byUser: Object.values(byUser),
      byTask: Object.values(byTask),
    };
  }

  // ─── Export ────────────────────────────────────────────────────────

  async exportTimeEntries(dto: ExportTimeEntriesDto, user: CurrentUserData) {
    const where = this.getWhereClause(dto, user);

    const entries = await this.prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        tasks: { select: { id: true, title: true, status: true } },
      },
      orderBy: { startTime: 'desc' },
      take: 5000,
    });

    if (dto.format === ExportFormat.CSV) {
      return this.generateCsv(entries, dto);
    }
    return this.generatePdf(entries, dto);
  }

  private generateCsv(
    entries: any[],
    dto: ExportTimeEntriesDto,
  ): { data: string; contentType: string; filename: string } {
    const headers = [
      'Date',
      'Start Time',
      'End Time',
      'Hours',
      'Description',
      'Billable',
      'User',
      'User Email',
      'Tasks',
    ];

    const rows = entries.map((entry) => {
      const startTime = new Date(entry.startTime);
      const endTime = new Date(entry.endTime);
      const userName = [entry.user?.firstName, entry.user?.lastName]
        .filter(Boolean)
        .join(' ') || 'N/A';
      const tasks = (entry.tasks || []).map((t: any) => t.title).join('; ');

      return [
        startTime.toISOString().split('T')[0],
        startTime.toISOString(),
        endTime.toISOString(),
        entry.hours.toString(),
        `"${(entry.description || '').replace(/"/g, '""')}"`,
        entry.isBillable ? 'Yes' : 'No',
        `"${userName}"`,
        entry.user?.email || '',
        `"${tasks}"`,
      ].join(',');
    });

    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    rows.push('');
    rows.push(`Total,,,"${totalHours}",,,,`);

    const dateRange = this.formatDateRange(dto);
    const csv = [
      `Time Entries Export${dateRange ? ' — ' + dateRange : ''}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      headers.join(','),
      ...rows,
    ].join('\n');

    return {
      data: csv,
      contentType: 'text/csv',
      filename: `time-entries-${new Date().toISOString().split('T')[0]}.csv`,
    };
  }

  private async generatePdf(
    entries: any[],
    dto: ExportTimeEntriesDto,
  ): Promise<{ data: Buffer; contentType: string; filename: string }> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => {
        resolve({
          data: Buffer.concat(chunks),
          contentType: 'application/pdf',
          filename: `time-entries-${new Date().toISOString().split('T')[0]}.pdf`,
        });
      });
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Time Entries Report', { align: 'center' });
      doc.moveDown(0.3);

      // Date range subtitle
      const dateRange = this.formatDateRange(dto);
      if (dateRange) {
        doc.fontSize(10).font('Helvetica').text(dateRange, { align: 'center' });
      }
      doc.fontSize(8).font('Helvetica')
        .text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
      doc.moveDown(1);

      // Summary
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      doc.fontSize(11).font('Helvetica-Bold').text('Summary');
      doc.fontSize(10).font('Helvetica')
        .text(`Total Entries: ${entries.length}    |    Total Hours: ${totalHours.toFixed(2)}`);
      doc.moveDown(1);

      // Table header
      const colX = [40, 120, 220, 320, 380, 440, 560];
      const colHeaders = ['Date', 'Start', 'End', 'Hours', 'Billable', 'User', 'Tasks'];
      const rowHeight = 18;

      doc.fontSize(9).font('Helvetica-Bold');
      colHeaders.forEach((header, i) => {
        doc.text(header, colX[i], doc.y, { continued: i < colHeaders.length - 1, width: 100 });
      });
      doc.moveDown(0.3);

      // Divider line
      const lineY = doc.y;
      doc.moveTo(40, lineY).lineTo(770, lineY).stroke();
      doc.moveDown(0.3);

      // Table rows
      doc.font('Helvetica').fontSize(8);
      for (const entry of entries) {
        if (doc.y > 540) {
          doc.addPage();
          doc.fontSize(8).font('Helvetica');
        }

        const startTime = new Date(entry.startTime);
        const endTime = new Date(entry.endTime);
        const userName = [entry.user?.firstName, entry.user?.lastName]
          .filter(Boolean)
          .join(' ') || 'N/A';
        const tasks = (entry.tasks || []).map((t: any) => t.title).join(', ');

        const y = doc.y;
        doc.text(startTime.toISOString().split('T')[0], colX[0], y, { width: 75 });
        doc.text(startTime.toLocaleTimeString(), colX[1], y, { width: 95 });
        doc.text(endTime.toLocaleTimeString(), colX[2], y, { width: 95 });
        doc.text(entry.hours.toFixed(2), colX[3], y, { width: 55 });
        doc.text(entry.isBillable ? 'Yes' : 'No', colX[4], y, { width: 55 });
        doc.text(userName, colX[5], y, { width: 115 });
        doc.text(tasks.substring(0, 40), colX[6], y, { width: 200 });
        doc.moveDown(0.8);
      }

      // Footer total
      doc.moveDown(0.5);
      const footerY = doc.y;
      doc.moveTo(40, footerY).lineTo(770, footerY).stroke();
      doc.moveDown(0.3);
      doc.fontSize(10).font('Helvetica-Bold')
        .text(`Total: ${totalHours.toFixed(2)} hours across ${entries.length} entries`);

      doc.end();
    });
  }

  private formatDateRange(dto: ExportTimeEntriesDto): string {
    const parts: string[] = [];
    if (dto.startDate) parts.push(`From: ${new Date(dto.startDate).toLocaleDateString()}`);
    if (dto.endDate) parts.push(`To: ${new Date(dto.endDate).toLocaleDateString()}`);
    return parts.join('  ');
  }

  private async validateTimeEntry(
    organizationId: string,
    userId: string,
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<{ startTime: string; endTime: string; hours: number }> {
    if (!startTime || !endTime) {
      throw new BadRequestException('Start time and end time are required');
    }

    let start = new Date(startTime);
    let end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid start or end time format');
    }

    let durationMs = end.getTime() - start.getTime();

    // Support midnight crossing if end time is before start time
    if (durationMs < 0) {
      // Add 24 hours to the end time
      end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      durationMs = end.getTime() - start.getTime();

      // If still negative or zero, it's truly invalid
      if (durationMs <= 0) {
        throw new BadRequestException('End time must be after start time');
      }
    } else if (durationMs === 0) {
      throw new BadRequestException('End time must be after start time');
    }

    const hours = durationMs / (1000 * 60 * 60);

    if (hours > 24) {
      throw new BadRequestException('Maximum 24 hours allowed per entry');
    }

    // Overlap check
    const overlapping = await this.prisma.timeEntry.findFirst({
      where: {
        organizationId,
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        OR: [
          // Case 1: Existing entry starts during new entry
          {
            startTime: {
              gt: start,
              lt: end,
            },
          },
          // Case 2: Existing entry ends during new entry
          {
            endTime: {
              gt: start,
              lt: end,
            },
          },
          // Case 3: New entry is inside existing entry
          {
            startTime: { lte: start },
            endTime: { gte: end },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException('Time entry overlaps with an existing entry');
    }

    return {
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      hours: Number(hours.toFixed(2)),
    };
  }
}
