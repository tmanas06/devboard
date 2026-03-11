import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { TaskStatus } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { QueryTasksDto } from './dto/query-tasks.dto';
import { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private activityService: ActivityService,
  ) { }

  async create(createTaskDto: CreateTaskDto, user: CurrentUserData) {
    const { assignedToIds: initialAssignedToIds, blockedByIds, organizationId: providedOrgId, dueDate, ...taskData } = createTaskDto;
    let assignedToIds = initialAssignedToIds;

    // Use provided organizationId or default to user's current organization
    const organizationId = providedOrgId || user.organizationId;

    if (!organizationId) {
      throw new BadRequestException('You must be a member of an organization to create tasks. Please contact an administrator to add you to an organization.');
    }

    // Convert dueDate string to DateTime if provided
    let dueDateValue: Date | undefined;
    if (dueDate) {
      // If it's just a date string (YYYY-MM-DD), convert to DateTime
      if (dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        dueDateValue = new Date(dueDate + 'T00:00:00Z');
      } else {
        // Otherwise, try to parse as ISO string
        dueDateValue = new Date(dueDate);
      }

      if (isNaN(dueDateValue.getTime())) {
        throw new BadRequestException('Invalid dueDate format. Expected ISO-8601 DateTime or YYYY-MM-DD date.');
      }
    }

    // Validate organization access
    if (user.role === 'MEMBER') {
      // Members can only create tasks for their organization
      if (organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only create tasks for your organization');
      }
      // Members can only assign tasks to themselves
      if (assignedToIds && assignedToIds.length > 0) {
        if (assignedToIds.length > 1 || assignedToIds[0] !== user.id) {
          throw new ForbiddenException('You can only assign tasks to yourself');
        }
      } else {
        // If assignedToIds not provided, assign to the member
        assignedToIds = [user.id];
      }
    } else if (user.role === 'ORG_ADMIN') {
      // OrgAdmins can only create tasks for their organization
      if (organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only create tasks for your organization');
      }
      // OrgAdmins can assign tasks to any member in their organization
      if (assignedToIds && assignedToIds.length > 0) {
        // Verify all assigned users belong to the same organization
        const assignedUsers = await this.prisma.user.findMany({
          where: { id: { in: assignedToIds } },
          include: {
            organizationMembers: {
              where: {
                organizationId: user.organizationId,
                isActive: true,
              },
            },
          },
        });

        if (assignedUsers.length !== assignedToIds.length) {
          throw new BadRequestException('One or more assigned users not found');
        }

        const invalidUsers = assignedUsers.filter(
          (u) => u.organizationMembers.length === 0,
        );
        if (invalidUsers.length > 0) {
          throw new BadRequestException('Cannot assign task to user outside your organization');
        }
      }
    }
    // ADMIN can create tasks for any organization/user

    return this.prisma.task.create({
      data: {
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        priority: taskData.priority,
        estimatedHours: taskData.estimatedHours,
        organizationId,
        ...(dueDateValue && { dueDate: dueDateValue }),
        ...(assignedToIds && assignedToIds.length > 0 && {
          assignedTo: {
            connect: assignedToIds.map((id) => ({ id })),
          },
        }),
        ...(blockedByIds && blockedByIds.length > 0 && {
          blockedBy: {
            connect: blockedByIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }).then(async (task) => {
      await this.activityService.log({
        organizationId,
        userId: user.id,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: task.id,
        metadata: { title: task.title, status: task.status, priority: task.priority },
      });
      return task;
    });
  }

  async findAll(query: QueryTasksDto, user: CurrentUserData) {
    const where = this.getWhereClause(query, user);

    const { page = 1, limit: rawLimit = 10 } = query;
    const limit = Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: {
              timeEntries: true,
            },
          },
        },
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private getWhereClause(query: QueryTasksDto, user: CurrentUserData) {
    const { organizationId, status, priority, assignedToIds, search } = query;
    const where: any = { isActive: true };

    if (user.role === 'MEMBER') {
      where.organizationId = user.organizationId;
      where.assignedTo = { some: { id: user.id } };
    } else if (user.role === 'ORG_ADMIN') {
      where.organizationId = user.organizationId;
    }

    if (organizationId) {
      if (user.role !== 'ADMIN' && organizationId !== user.organizationId) {
        throw new ForbiddenException('You can only access tasks from your organization');
      }
      where.organizationId = organizationId;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToIds && assignedToIds.length > 0) {
      if (user.role === 'MEMBER') {
        const hasOtherUser = assignedToIds.some(id => id !== user.id);
        if (hasOtherUser) {
          throw new ForbiddenException('You can only view tasks assigned to yourself');
        }
      }
      where.assignedTo = { some: { id: { in: assignedToIds } } };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        blockedBy: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        blocks: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
        },
      },
    });

    if (!task || !task.isActive) {
      throw new NotFoundException('Task not found');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, user: CurrentUserData) {
    const task = await this.findOne(id);

    // Validate organization access
    if (user.role === 'MEMBER' && task.organizationId !== user.organizationId) {
      throw new ForbiddenException('You can only update tasks in your organization');
    }
    if (user.role === 'ORG_ADMIN' && task.organizationId !== user.organizationId) {
      throw new ForbiddenException('You can only update tasks in your organization');
    }

    const { assignedToIds, blockedByIds, dueDate, ...taskData } = updateTaskDto;

    // Convert dueDate string to DateTime if provided
    let dueDateValue: Date | undefined;
    if (dueDate !== undefined) {
      if (dueDate === null) {
        dueDateValue = null as any; // Allow null to clear the dueDate
      } else {
        // If it's just a date string (YYYY-MM-DD), convert to DateTime
        if (typeof dueDate === 'string' && dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
          dueDateValue = new Date(dueDate + 'T00:00:00Z');
        } else if (typeof dueDate === 'string') {
          // Otherwise, try to parse as ISO string
          dueDateValue = new Date(dueDate);
        } else {
          dueDateValue = dueDate as Date;
        }

        if (dueDateValue && isNaN(dueDateValue.getTime())) {
          throw new BadRequestException('Invalid dueDate format. Expected ISO-8601 DateTime or YYYY-MM-DD date.');
        }
      }
    }

    // Validate assigned users if provided
    if (assignedToIds !== undefined) {
      if (user.role === 'MEMBER') {
        // Members can only assign tasks to themselves
        if (assignedToIds.length > 1 || (assignedToIds.length > 0 && assignedToIds[0] !== user.id)) {
          throw new ForbiddenException('You can only assign tasks to yourself');
        }
        if (assignedToIds.length === 0) {
          assignedToIds.push(user.id);
        }
      } else if (user.role === 'ORG_ADMIN') {
        // OrgAdmins can assign tasks to any member in their organization
        if (assignedToIds.length > 0) {
          const assignedUsers = await this.prisma.user.findMany({
            where: { id: { in: assignedToIds } },
            include: {
              organizationMembers: {
                where: {
                  organizationId: task.organizationId,
                  isActive: true,
                },
              },
            },
          });

          if (assignedUsers.length !== assignedToIds.length) {
            throw new BadRequestException('One or more assigned users not found');
          }

          const invalidUsers = assignedUsers.filter(
            (u) => u.organizationMembers.length === 0,
          );
          if (invalidUsers.length > 0) {
            throw new BadRequestException('Cannot assign task to user outside your organization');
          }
        }
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(taskData.title !== undefined && { title: taskData.title }),
        ...(taskData.description !== undefined && { description: taskData.description }),
        ...(taskData.status !== undefined && { status: taskData.status }),
        ...(taskData.priority !== undefined && { priority: taskData.priority }),
        ...(taskData.estimatedHours !== undefined && { estimatedHours: taskData.estimatedHours }),
        ...(dueDate !== undefined && { dueDate: dueDateValue }),
        ...(assignedToIds !== undefined && {
          assignedTo: {
            set: assignedToIds.length > 0
              ? assignedToIds.map((userId) => ({ id: userId }))
              : [],
          },
        }),
        ...(blockedByIds !== undefined && {
          blockedBy: {
            set: blockedByIds.length > 0
              ? blockedByIds.map((taskId) => ({ id: taskId }))
              : [],
          },
        }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    }).then(async (updated) => {
      const action = taskData.status !== undefined && Object.keys(taskData).length === 1
        ? 'TASK_STATUS_CHANGED' as const
        : assignedToIds !== undefined && Object.keys(taskData).length === 0
          ? 'TASK_ASSIGNED' as const
          : 'TASK_UPDATED' as const;
      await this.activityService.log({
        organizationId: task.organizationId,
        userId: user.id,
        action,
        entityType: 'TASK',
        entityId: id,
        metadata: {
          title: updated.title,
          ...(taskData.status !== undefined && { oldStatus: task.status, newStatus: taskData.status }),
          ...(assignedToIds !== undefined && { assignedToIds }),
        },
      });
      return updated;
    });
  }

  async remove(id: string, user?: CurrentUserData) {
    const task = await this.findOne(id);

    const result = await this.prisma.task.update({
      where: { id },
      data: { isActive: false },
    });

    if (user) {
      await this.activityService.log({
        organizationId: task.organizationId,
        userId: user.id,
        action: 'TASK_DELETED',
        entityType: 'TASK',
        entityId: id,
        metadata: { title: task.title },
      });
    }

    return result;
  }

  async findAllGroupedByStatus(user: CurrentUserData): Promise<Record<string, any[]>> {
    // Build where clause based on user role
    const where: any = { isActive: true };

    if (user.role === 'MEMBER') {
      where.organizationId = user.organizationId;
      where.assignedTo = { some: { id: user.id } };
    } else if (user.role === 'ORG_ADMIN') {
      where.organizationId = user.organizationId;
    }
    // ADMIN can see all tasks

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: [{ boardOrder: 'asc' }, { createdAt: 'desc' }],
    });

    // Group by status
    const grouped: Record<string, any[]> = {};
    for (const status of Object.values(TaskStatus)) {
      grouped[status] = tasks.filter((t) => t.status === status);
    }
    return grouped;
  }

  async updateStatus(id: string, dto: UpdateStatusDto, user: CurrentUserData) {
    const task = await this.findOne(id);

    // Validate organization access
    if (user.role === 'MEMBER' && task.organizationId !== user.organizationId) {
      throw new ForbiddenException('You can only update tasks in your organization');
    }
    if (user.role === 'ORG_ADMIN' && task.organizationId !== user.organizationId) {
      throw new ForbiddenException('You can only update tasks in your organization');
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.boardOrder !== undefined && { boardOrder: dto.boardOrder }),
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    await this.activityService.log({
      organizationId: task.organizationId,
      userId: user.id,
      action: 'TASK_STATUS_CHANGED',
      entityType: 'TASK',
      entityId: id,
      metadata: { title: task.title, oldStatus: task.status, newStatus: dto.status },
    });

    return updated;
  }

  // ─── Bulk operations ───────────────────────────────────────────────

  async bulkRemove(ids: string[], user: CurrentUserData) {
    // Validate all tasks exist and belong to user's org
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: ids }, isActive: true },
    });

    if (tasks.length !== ids.length) {
      throw new NotFoundException('One or more tasks not found');
    }

    if (user.role !== 'ADMIN') {
      const unauthorized = tasks.filter((t) => t.organizationId !== user.organizationId);
      if (unauthorized.length > 0) {
        throw new ForbiddenException('You can only delete tasks in your organization');
      }
    }

    const result = await this.prisma.task.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });

    await this.activityService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'TASK_BULK_DELETED',
      entityType: 'TASK',
      metadata: { count: ids.length, taskTitles: tasks.map((t) => t.title) },
    });

    return result;
  }

  async bulkUpdateStatus(ids: string[], status: TaskStatus, user: CurrentUserData) {
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: ids }, isActive: true },
    });

    if (tasks.length !== ids.length) {
      throw new NotFoundException('One or more tasks not found');
    }

    if (user.role !== 'ADMIN') {
      const unauthorized = tasks.filter((t) => t.organizationId !== user.organizationId);
      if (unauthorized.length > 0) {
        throw new ForbiddenException('You can only update tasks in your organization');
      }
    }

    const result = await this.prisma.task.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    await this.activityService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'TASK_BULK_STATUS_CHANGED',
      entityType: 'TASK',
      metadata: { count: ids.length, newStatus: status, taskTitles: tasks.map((t) => t.title) },
    });

    return result;
  }

  async bulkAssign(ids: string[], assignedToIds: string[], user: CurrentUserData) {
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: ids }, isActive: true },
    });

    if (tasks.length !== ids.length) {
      throw new NotFoundException('One or more tasks not found');
    }

    if (user.role !== 'ADMIN') {
      const unauthorized = tasks.filter((t) => t.organizationId !== user.organizationId);
      if (unauthorized.length > 0) {
        throw new ForbiddenException('You can only assign tasks in your organization');
      }
    }

    // Validate assigned users belong to the organization
    if (assignedToIds.length > 0 && user.role !== 'ADMIN') {
      const assignedUsers = await this.prisma.user.findMany({
        where: { id: { in: assignedToIds } },
        include: {
          organizationMembers: {
            where: {
              organizationId: user.organizationId,
              isActive: true,
            },
          },
        },
      });

      if (assignedUsers.length !== assignedToIds.length) {
        throw new BadRequestException('One or more assigned users not found');
      }

      const invalidUsers = assignedUsers.filter((u) => u.organizationMembers.length === 0);
      if (invalidUsers.length > 0) {
        throw new BadRequestException('Cannot assign task to user outside your organization');
      }
    }

    // Use transaction to update all task assignments
    const result = await this.prisma.$transaction(
      ids.map((id) =>
        this.prisma.task.update({
          where: { id },
          data: {
            assignedTo: {
              set: assignedToIds.map((userId) => ({ id: userId })),
            },
          },
        }),
      ),
    );

    await this.activityService.log({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'TASK_BULK_ASSIGNED',
      entityType: 'TASK',
      metadata: { count: ids.length, assignedToIds, taskTitles: tasks.map((t) => t.title) },
    });

    return result;
  }

  // ─── Task Dependencies ─────────────────────────────────────────────

  async addDependency(taskId: string, dependsOnId: string, user: CurrentUserData) {
    if (taskId === dependsOnId) {
      throw new BadRequestException('A task cannot depend on itself');
    }

    const [task, dependsOn] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.task.findUnique({ where: { id: dependsOnId } }),
    ]);

    if (!task || !task.isActive || !dependsOn || !dependsOn.isActive) {
      throw new NotFoundException('One or both tasks not found');
    }

    // Validate organization access
    if (user.role !== 'ADMIN') {
      if (task.organizationId !== user.organizationId || dependsOn.organizationId !== user.organizationId) {
        throw new ForbiddenException('Both tasks must belong to your organization');
      }
    }

    // Check for circular dependency
    const isCircular = await this.checkCircularDependency(taskId, dependsOnId);
    if (isCircular) {
      throw new BadRequestException('Circular dependency detected');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        blockedBy: {
          connect: { id: dependsOnId },
        },
      },
      include: {
        blockedBy: true,
        blocks: true,
      },
    });
  }

  async removeDependency(taskId: string, dependsOnId: string, user: CurrentUserData) {
    const task = await this.prisma.task.findUnique({ where: { id: taskId } });
    if (!task || !task.isActive) {
      throw new NotFoundException('Task not found');
    }

    if (user.role !== 'ADMIN' && task.organizationId !== user.organizationId) {
      throw new ForbiddenException('Task does not belong to your organization');
    }

    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        blockedBy: {
          disconnect: { id: dependsOnId },
        },
      },
      include: {
        blockedBy: true,
        blocks: true,
      },
    });
  }

  private async checkCircularDependency(taskId: string, potentialDependencyId: string): Promise<boolean> {
    // If we want to make taskId depend on potentialDependencyId,
    // we must check if taskId already (directly or indirectly) blocks potentialDependencyId.
    // If it does, adding taskId -> potentialDependencyId creates a cycle.

    const visited = new Set<string>();
    const stack = [taskId];

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      if (currentId === potentialDependencyId) return true;

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const blocking = await this.prisma.task.findUnique({
        where: { id: currentId },
        select: { blocks: { select: { id: true } } },
      });

      if (blocking?.blocks) {
        for (const child of blocking.blocks) {
          stack.push(child.id);
        }
      }
    }

    return false;
  }
}

