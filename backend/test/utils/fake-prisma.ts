import { TaskPriority, TaskStatus, type ActivityAction } from '@prisma/client';

export type TaskRecord = {
  id: string;
  organizationId: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  blockedByIds: string[];
  blocksIds: string[];
};

export type TimeEntryRecord = {
  id: string;
  organizationId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  hours: number;
  description?: string | null;
  isBillable?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ActivityLogRecord = {
  id: string;
  organizationId: string;
  userId: string;
  action: ActivityAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
};

let idCounter = 1;
const nextId = (prefix: string) => `${prefix}_${idCounter++}`;

export class FakePrismaService {
  tasks: TaskRecord[] = [];
  timeEntries: TimeEntryRecord[] = [];
  activityLogs: ActivityLogRecord[] = [];

  reset() {
    this.tasks = [];
    this.timeEntries = [];
    this.activityLogs = [];
  }

  task = {
    create: async (args: any) => {
      const now = new Date();
      const id = args.data.id || nextId('task');
      const blockedByIds = (args.data.blockedBy?.connect || []).map((c: any) => c.id);
      const record: TaskRecord = {
        id,
        organizationId: args.data.organizationId,
        title: args.data.title,
        description: args.data.description || null,
        status: args.data.status || TaskStatus.TODO,
        priority: args.data.priority || TaskPriority.MEDIUM,
        isActive: args.data.isActive ?? true,
        createdAt: now,
        updatedAt: now,
        blockedByIds,
        blocksIds: [],
      };
      this.tasks.push(record);

      // Update reverse relation
      blockedByIds.forEach((blockedId) => {
        const blockedTask = this.tasks.find((t) => t.id === blockedId);
        if (blockedTask && !blockedTask.blocksIds.includes(id)) {
          blockedTask.blocksIds.push(id);
        }
      });

      return this._withTaskIncludes(record, args.include);
    },

    findUnique: async (args: any) => {
      const id = args.where?.id;
      const record = this.tasks.find((t) => t.id === id) || null;
      if (!record) return null;

      if (args.select?.blocks) {
        return {
          blocks: record.blocksIds.map((blockId) => ({ id: blockId })),
        } as any;
      }

      return this._withTaskIncludes(record, args.include);
    },

    findMany: async (args: any) => {
      const where = args?.where || {};
      let results = [...this.tasks];
      if (where.id?.in) {
        results = results.filter((t) => where.id.in.includes(t.id));
      }
      if (where.isActive !== undefined) {
        results = results.filter((t) => t.isActive === where.isActive);
      }
      if (where.organizationId) {
        results = results.filter((t) => t.organizationId === where.organizationId);
      }

      return results.map((t) => this._withTaskIncludes(t, args.include));
    },

    update: async (args: any) => {
      const record = this.tasks.find((t) => t.id === args.where.id);
      if (!record) return null;

      if (args.data.title !== undefined) record.title = args.data.title;
      if (args.data.description !== undefined) record.description = args.data.description;
      if (args.data.status !== undefined) record.status = args.data.status;
      if (args.data.priority !== undefined) record.priority = args.data.priority;
      if (args.data.isActive !== undefined) record.isActive = args.data.isActive;

      if (args.data.blockedBy?.connect) {
        const connectValue = args.data.blockedBy.connect;
        const ids = Array.isArray(connectValue) ? connectValue.map((c: any) => c.id) : [connectValue.id];
        ids.forEach((blockedId: string) => {
          if (!record.blockedByIds.includes(blockedId)) {
            record.blockedByIds.push(blockedId);
          }
          const blockedTask = this.tasks.find((t) => t.id === blockedId);
          if (blockedTask && !blockedTask.blocksIds.includes(record.id)) {
            blockedTask.blocksIds.push(record.id);
          }
        });
      }

      if (args.data.blockedBy?.disconnect) {
        const ids = args.data.blockedBy.disconnect.map((c: any) => c.id);
        record.blockedByIds = record.blockedByIds.filter((id) => !ids.includes(id));
        this.tasks.forEach((t) => {
          t.blocksIds = t.blocksIds.filter((id) => id !== record.id || !ids.includes(t.id));
        });
      }

      if (args.data.blockedBy?.set) {
        const ids = args.data.blockedBy.set.map((c: any) => c.id);
        record.blockedByIds = [...ids];
      }

      record.updatedAt = new Date();
      return this._withTaskIncludes(record, args.include);
    },

    updateMany: async (args: any) => {
      const ids = args.where?.id?.in || [];
      const targets = this.tasks.filter((t) => ids.includes(t.id));
      targets.forEach((t) => {
        Object.assign(t, args.data);
        t.updatedAt = new Date();
      });
      return { count: targets.length };
    },
  };

  timeEntry = {
    create: async (args: any) => {
      const now = new Date();
      const id = args.data.id || nextId('time');
      const record: TimeEntryRecord = {
        id,
        organizationId: args.data.organizationId,
        userId: args.data.userId,
        startTime: new Date(args.data.startTime),
        endTime: new Date(args.data.endTime),
        hours: args.data.hours,
        description: args.data.description || null,
        isBillable: args.data.isBillable || false,
        createdAt: now,
        updatedAt: now,
      };
      this.timeEntries.push(record);
      return this._withTimeEntryIncludes(record, args.include);
    },

    findFirst: async (args: any) => {
      const where = args.where || {};
      const excludeId = where.id?.not;
      const userId = where.userId;
      const organizationId = where.organizationId;
      const or = where.OR || [];
      const start =
        or[0]?.startTime?.gt ||
        or[1]?.endTime?.gt ||
        or[2]?.startTime?.lte ||
        new Date(0);
      const end =
        or[0]?.startTime?.lt ||
        or[1]?.endTime?.lt ||
        or[2]?.endTime?.gte ||
        new Date(0);

      return (
        this.timeEntries.find((entry) => {
          if (excludeId && entry.id === excludeId) return false;
          if (userId && entry.userId !== userId) return false;
          if (organizationId && entry.organizationId !== organizationId) return false;
          const overlap = entry.startTime < new Date(end) && entry.endTime > new Date(start);
          return overlap;
        }) || null
      );
    },

    findMany: async (args: any) => {
      const where = args?.where || {};
      let results = [...this.timeEntries];
      if (where.organizationId) {
        results = results.filter((t) => t.organizationId === where.organizationId);
      }
      if (where.userId) {
        results = results.filter((t) => t.userId === where.userId);
      }
      if (where.id?.in) {
        results = results.filter((t) => where.id.in.includes(t.id));
      }
      return results.map((t) => this._withTimeEntryIncludes(t, args.include));
    },

    update: async (args: any) => {
      const record = this.timeEntries.find((t) => t.id === args.where.id);
      if (!record) return null;
      if (args.data.startTime) record.startTime = new Date(args.data.startTime);
      if (args.data.endTime) record.endTime = new Date(args.data.endTime);
      if (args.data.hours !== undefined) record.hours = args.data.hours;
      if (args.data.description !== undefined) record.description = args.data.description;
      record.updatedAt = new Date();
      return this._withTimeEntryIncludes(record, args.include);
    },

    deleteMany: async (args: any) => {
      const ids = args.where?.id?.in || [];
      const before = this.timeEntries.length;
      this.timeEntries = this.timeEntries.filter((t) => !ids.includes(t.id));
      return { count: before - this.timeEntries.length };
    },

    delete: async (args: any) => {
      const idx = this.timeEntries.findIndex((t) => t.id === args.where.id);
      if (idx === -1) return null;
      const [record] = this.timeEntries.splice(idx, 1);
      return record;
    },
  };

  activityLog = {
    create: async (args: any) => {
      const record: ActivityLogRecord = {
        id: nextId('activity'),
        organizationId: args.data.organizationId,
        userId: args.data.userId,
        action: args.data.action,
        entityType: args.data.entityType,
        entityId: args.data.entityId || null,
        metadata: args.data.metadata || null,
        createdAt: new Date(),
      };
      this.activityLogs.push(record);
      return record;
    },

    findMany: async (args: any) => {
      const where = args.where || {};
      let results = [...this.activityLogs];
      if (where.organizationId) {
        results = results.filter((l) => l.organizationId === where.organizationId);
      }
      if (where.action) {
        results = results.filter((l) => l.action === where.action);
      }
      if (where.userId) {
        results = results.filter((l) => l.userId === where.userId);
      }
      return results;
    },

    count: async (args: any) => {
      const where = args.where || {};
      let results = [...this.activityLogs];
      if (where.organizationId) {
        results = results.filter((l) => l.organizationId === where.organizationId);
      }
      return results.length;
    },
  };

  $transaction = async <T>(promises: Promise<T>[]) => Promise.all(promises);

  private _withTaskIncludes(task: TaskRecord, include?: any) {
    if (!include) return task;
    return {
      ...task,
      blockedBy: include.blockedBy ? task.blockedByIds.map((id) => ({ id })) : undefined,
      blocks: include.blocks ? task.blocksIds.map((id) => ({ id })) : undefined,
      assignedTo: include.assignedTo ? [] : undefined,
    } as any;
  }

  private _withTimeEntryIncludes(entry: TimeEntryRecord, include?: any) {
    if (!include) return entry;
    return {
      ...entry,
      user: include.user ? { id: entry.userId, firstName: 'Test', lastName: 'User', email: 'test@example.com' } : undefined,
      tasks: include.tasks ? [] : undefined,
    } as any;
  }
}
