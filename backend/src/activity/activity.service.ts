import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityAction } from '@prisma/client';
import { QueryActivityDto } from './dto/query-activity.dto';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ActivityService {
    constructor(private prisma: PrismaService) { }

    /**
     * Create an activity log entry. This is called from other services
     * to record user actions.
     */
    async log(params: {
        organizationId: string;
        userId: string;
        action: ActivityAction;
        entityType: string;
        entityId?: string;
        metadata?: Record<string, any>;
    }) {
        return this.prisma.activityLog.create({
            data: {
                organizationId: params.organizationId,
                userId: params.userId,
                action: params.action,
                entityType: params.entityType,
                entityId: params.entityId || null,
                metadata: params.metadata || undefined,
            },
        });
    }

    /**
     * Fetch activity logs for the user's organization with filters + pagination.
     */
    async findAll(query: QueryActivityDto, user: CurrentUserData) {
        const { action, entityType, userId, startDate, endDate, page = 1, limit = 30 } = query;

        const where: any = {
            organizationId: user.organizationId,
        };

        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const [items, total] = await Promise.all([
            this.prisma.activityLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                },
            }),
            this.prisma.activityLog.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    /**
     * Export activity logs as a CSV string.
     */
    async exportCsv(query: QueryActivityDto, user: CurrentUserData): Promise<string> {
        // Fetch all matching records (no pagination)
        const { action, entityType, userId, startDate, endDate } = query;

        const where: any = {
            organizationId: user.organizationId,
        };
        if (action) where.action = action;
        if (entityType) where.entityType = entityType;
        if (userId) where.userId = userId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt.gte = new Date(startDate);
            if (endDate) where.createdAt.lte = new Date(endDate);
        }

        const logs = await this.prisma.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 5000,
            include: {
                user: {
                    select: { firstName: true, lastName: true, email: true },
                },
            },
        });

        const header = 'Date,User,Email,Action,Entity Type,Entity ID,Details';
        const rows = logs.map((log) => {
            const name = [log.user.firstName, log.user.lastName].filter(Boolean).join(' ') || 'Unknown';
            const meta = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : '';
            return [
                log.createdAt.toISOString(),
                `"${name}"`,
                log.user.email,
                log.action,
                log.entityType,
                log.entityId || '',
                `"${meta}"`,
            ].join(',');
        });

        return [header, ...rows].join('\n');
    }
}
