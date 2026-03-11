import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { ExportFormat } from './dto/export-time-entries.dto';

// Mock PDFDocument
jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    fontSize: jest.fn().mockReturnThis(),
    font: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    moveDown: jest.fn().mockReturnThis(),
    moveTo: jest.fn().mockReturnThis(),
    lineTo: jest.fn().mockReturnThis(),
    stroke: jest.fn().mockReturnThis(),
    addPage: jest.fn().mockReturnThis(),
    end: jest.fn().mockImplementation(function (this: any) {
      if (this.on.mock.calls.some((call: any) => call[0] === 'end')) {
        const endCallback = this.on.mock.calls.find((call: any) => call[0] === 'end')[1];
        endCallback();
      }
    }),
  }));
});

const createAdmin = () => ({
  id: 'admin_1',
  role: 'ADMIN',
  organizationId: 'org_1',
});

const createMember = () => ({
  id: 'member_1',
  role: 'MEMBER',
  organizationId: 'org_1',
});

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  let prisma: any;
  let activityService: any;

  beforeEach(() => {
    prisma = {
      task: { findMany: jest.fn() },
      timeEntry: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };
    activityService = { log: jest.fn() };
    service = new TimeEntriesService(prisma, activityService);
  });

  describe('create', () => {
    it('rejects entries longer than 24 hours', async () => {
      const user = createAdmin();
      prisma.task.findMany.mockResolvedValue([]);
      prisma.timeEntry.findFirst.mockResolvedValue(null);

      await expect(
        service.create({
          organizationId: user.organizationId,
          userId: user.id,
          startTime: '2026-03-09T00:00:00.000Z',
          endTime: '2026-03-10T01:00:00.000Z',
          hours: 25,
        }, user as any),
      ).rejects.toThrow(new BadRequestException('Maximum 24 hours allowed per entry'));
    });

    it('prevents overlapping time entries', async () => {
      const user = createAdmin();
      prisma.task.findMany.mockResolvedValue([]);
      prisma.timeEntry.findFirst.mockResolvedValue({ id: 'time_1' });

      await expect(
        service.create({
          organizationId: user.organizationId,
          userId: user.id,
          startTime: '2026-03-09T09:00:00.000Z',
          endTime: '2026-03-09T10:00:00.000Z',
          hours: 1,
        }, user as any),
      ).rejects.toThrow(new BadRequestException('Time entry overlaps with an existing entry'));
    });

    it('prevents Member from creating entry for another user', async () => {
      const user = createMember();
      await expect(service.create({
        userId: 'other_user',
        startTime: '2026-03-09T09:00:00.000Z',
        endTime: '2026-03-09T10:00:00.000Z',
        hours: 1,
      }, user as any)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reporting and export', () => {
    it('exports time entries to CSV', async () => {
      const user = createAdmin();
      jest.spyOn(service, 'findAll').mockResolvedValue([
        {
          id: 'time_1',
          startTime: new Date('2026-03-09T09:00:00.000Z'),
          endTime: new Date('2026-03-09T10:00:00.000Z'),
          hours: 1,
          description: 'Test entry',
          isBillable: false,
          user: { firstName: 'Test', lastName: 'User', email: 'test@example.com' },
          tasks: [],
        },
      ] as any);

      const result = await service.exportTimeEntries({
        format: ExportFormat.CSV,
        organizationId: user.organizationId,
      }, user as any);

      expect(result.contentType).toBe('text/csv');
      expect(result.data).toContain('Time Entries Export');
    });

    it('exports time entries to PDF', async () => {
      const user = createAdmin();
      jest.spyOn(service, 'findAll').mockResolvedValue([
        {
          id: 'time_1',
          startTime: new Date('2026-03-09T09:00:00.000Z'),
          endTime: new Date('2026-03-09T10:00:00.000Z'),
          hours: 1,
          user: { firstName: 'Test', lastName: 'User' },
          tasks: [],
        },
      ] as any);

      const result = await service.exportTimeEntries({
        format: ExportFormat.PDF,
        organizationId: user.organizationId,
      }, user as any);

      expect(result.contentType).toBe('application/pdf');
      expect(result.data).toBeDefined();
    });

    it('calculates time summary correctly', async () => {
      const user = createAdmin();
      prisma.timeEntry.findMany.mockResolvedValue([
        { id: '1', hours: 5, userId: 'u1', user: { id: 'u1' }, tasks: [{ id: 't1', title: 'T1' }] },
        { id: '2', hours: 3, userId: 'u1', user: { id: 'u1' }, tasks: [{ id: 't2', title: 'T2' }] },
      ]);

      const result = await service.getTimeSummary({}, user as any);

      expect(result.summary.totalHours).toBe(8);
      expect(result.byUser).toHaveLength(1);
      expect(result.byTask).toHaveLength(2);
    });
  });
});
