import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TaskStatus, TaskPriority } from '@prisma/client';
import { TasksService } from './tasks.service';

const createAdmin = () => ({
  id: 'admin_1',
  role: 'ADMIN',
  organizationId: 'org_1',
});

const createOrgAdmin = () => ({
  id: 'org_admin_1',
  role: 'ORG_ADMIN',
  organizationId: 'org_1',
});

const createMember = () => ({
  id: 'member_1',
  role: 'MEMBER',
  organizationId: 'org_1',
});

describe('TasksService', () => {
  let service: TasksService;
  let prisma: any;
  let activityService: any;

  beforeEach(() => {
    prisma = {
      task: {
        create: jest.fn().mockImplementation(() => ({
          then: jest.fn().mockImplementation((cb) => Promise.resolve({ id: 'task_1', title: 'Test Task', status: TaskStatus.TODO, priority: TaskPriority.MEDIUM }).then(cb))
        })),
        update: jest.fn().mockImplementation(() => ({
          then: jest.fn().mockImplementation((cb) => Promise.resolve({ id: 'task_1', status: TaskStatus.DONE }).then(cb))
        })),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };
    activityService = { log: jest.fn() };
    service = new TasksService(prisma, activityService);

    // Default mock for findUnique to avoid unexpected failures
    prisma.task.findUnique.mockResolvedValue({ id: 'some_id', isActive: true, organizationId: 'org_1' });
  });

  describe('create', () => {
    it('creates a task and logs activity (Admin)', async () => {
      const user = createAdmin();
      // Reset mock for this specific test to use simplified then
      prisma.task.create.mockImplementation(() => Promise.resolve({
        id: 'task_1',
        title: 'Test Task',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
      }));

      const result = await service.create({
        title: 'Test Task',
        organizationId: 'org_1',
      }, user as any);

      expect(result.id).toBe('task_1');
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_CREATED',
          organizationId: 'org_1',
        }),
      );
    });

    it('prevents Member from assigning task to others', async () => {
      const user = createMember();
      await expect(service.create({
        title: 'Forbidden Task',
        assignedToIds: ['other_user'],
      }, user as any)).rejects.toThrow(ForbiddenException);
    });

    it('validates assigned users exist in organization (OrgAdmin)', async () => {
      const user = createOrgAdmin();
      prisma.user.findMany.mockResolvedValue([
        { id: 'user_1', organizationMembers: [{ organizationId: 'org_1' }] }
      ]);
      prisma.task.create.mockImplementation(() => Promise.resolve({ id: 'task_1' }));

      await service.create({
        title: 'Valid Assignment',
        assignedToIds: ['user_1'],
      }, user as any);

      expect(prisma.task.create).toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('updates task status and logs activity', async () => {
      const user = createAdmin();
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'task_1',
        title: 'Test Task',
        status: TaskStatus.TODO,
        organizationId: 'org_1',
      } as any);
      prisma.task.update.mockImplementation(() => Promise.resolve({ id: 'task_1', status: TaskStatus.DONE }));

      await service.updateStatus('task_1', { status: TaskStatus.DONE }, user as any);

      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TASK_STATUS_CHANGED',
          entityId: 'task_1',
          metadata: expect.objectContaining({ oldStatus: TaskStatus.TODO, newStatus: TaskStatus.DONE }),
        }),
      );
    });

    it('prevents updating task in different organization (OrgAdmin)', async () => {
      const user = createOrgAdmin();
      jest.spyOn(service, 'findOne').mockResolvedValue({
        id: 'task_1',
        organizationId: 'other_org',
      } as any);

      await expect(service.updateStatus('task_1', { status: TaskStatus.DONE }, user as any))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('bulk operations', () => {
    it('bulk removes tasks', async () => {
      const user = createAdmin();
      const ids = ['t1', 't2'];
      prisma.task.findMany.mockResolvedValue([
        { id: 't1', title: 'T1', organizationId: 'org_1', isActive: true },
        { id: 't2', title: 'T2', organizationId: 'org_1', isActive: true },
      ]);
      prisma.task.updateMany.mockResolvedValue({ count: 2 });

      await service.bulkRemove(ids, user as any);

      expect(prisma.task.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: { isActive: false },
      });
      expect(activityService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'TASK_BULK_DELETED' })
      );
    });

    it('throws error if some tasks not found during bulk remove', async () => {
      const user = createAdmin();
      prisma.task.findMany.mockResolvedValue([{ id: 't1' }]);
      await expect(service.bulkRemove(['t1', 't2'], user as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('dependencies', () => {
    it('prevents circular dependencies', async () => {
      const user = createAdmin();
      prisma.task.findUnique.mockResolvedValueOnce({ id: 'task_1', organizationId: 'org_1', isActive: true });
      prisma.task.findUnique.mockResolvedValueOnce({ id: 'task_2', organizationId: 'org_1', isActive: true });

      // Mock the internal checkCircularDependency logic
      // task_1 blocks task_3, task_3 blocks task_2. Adding task_1 depends on task_2 creates cycle.
      prisma.task.findUnique.mockImplementation((args: any) => {
        if (args.where.id === 'task_1') return Promise.resolve({ id: 'task_1', blocks: [{ id: 'task_3' }] });
        if (args.where.id === 'task_3') return Promise.resolve({ id: 'task_3', blocks: [{ id: 'task_2' }] });
        return Promise.resolve(null);
      });

      await expect(service.addDependency('task_1', 'task_2', user as any))
        .rejects
        .toThrow(new BadRequestException('Circular dependency detected'));
    });

    it('successfully adds dependency', async () => {
      const user = createAdmin();
      // Setup findUnique to return valid tasks for the first two calls and no blocks for the circular check
      prisma.task.findUnique
        .mockResolvedValueOnce({ id: 't1', organizationId: 'org_1', isActive: true }) // task
        .mockResolvedValueOnce({ id: 't2', organizationId: 'org_1', isActive: true }) // dependsOn
        .mockResolvedValueOnce({ id: 't1', blocks: [] }); // circular check for t1

      prisma.task.update.mockImplementation(() => Promise.resolve({ id: 't1' }));

      await service.addDependency('t1', 't2', user as any);

      expect(prisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't1' },
          data: { blockedBy: { connect: { id: 't2' } } }
        })
      );
    });
  });
});
