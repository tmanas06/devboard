import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { FakePrismaService } from './utils/fake-prisma';

describe('Time Entries API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: FakePrismaService;

  beforeEach(async () => {
    prisma = new FakePrismaService();
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = {
            id: 'user_1',
            role: 'ADMIN',
            organizationId: 'org_1',
            organizationMemberships: [],
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('creates a time entry', async () => {
    const result = await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T09:00:00.000Z',
        endTime: '2026-03-09T10:00:00.000Z',
        hours: 1,
      })
      .expect(201);

    expect(result.body.hours).toBe(1);
  });

  it('rejects entries longer than 24 hours', async () => {
    await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T00:00:00.000Z',
        endTime: '2026-03-10T01:00:00.000Z',
        hours: 25,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Maximum 24 hours allowed per entry');
      });
  });

  it('prevents overlapping time entries', async () => {
    await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T09:00:00.000Z',
        endTime: '2026-03-09T10:00:00.000Z',
        hours: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T09:30:00.000Z',
        endTime: '2026-03-09T10:30:00.000Z',
        hours: 1,
      })
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('Time entry overlaps with an existing entry');
      });
  });

  it('exports time entries to CSV', async () => {
    await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T09:00:00.000Z',
        endTime: '2026-03-09T10:00:00.000Z',
        hours: 1,
      })
      .expect(201);

    const result = await request(app.getHttpServer())
      .get('/time-entries/reports/export?format=csv&organizationId=org_1')
      .expect(200);

    expect(result.headers['content-type']).toContain('text/csv');
    expect(result.text).toContain('Time Entries Export');
    expect(result.text).toContain('Start Time,End Time');
  });

  it('exports time entries to PDF', async () => {
    await request(app.getHttpServer())
      .post('/time-entries')
      .send({
        organizationId: 'org_1',
        userId: 'user_1',
        startTime: '2026-03-09T09:00:00.000Z',
        endTime: '2026-03-09T10:00:00.000Z',
        hours: 1,
      })
      .expect(201);

    const result = await request(app.getHttpServer())
      .get('/time-entries/reports/export?format=pdf&organizationId=org_1')
      .expect(200);

    expect(result.headers['content-type']).toContain('application/pdf');
    expect(result.body).toBeDefined();
  });
});
