import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthGuard } from '../src/auth/auth.guard';
import { TaskStatus } from '@prisma/client';
import { FakePrismaService } from './utils/fake-prisma';

describe('Tasks API (e2e)', () => {
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

  it('creates a task and logs activity', async () => {
    await request(app.getHttpServer())
      .post('/tasks')
      .send({
        title: 'E2E Task',
        organizationId: 'org_1',
      })
      .expect(201);

    const activity = await request(app.getHttpServer())
      .get('/activity')
      .expect(200);

    expect(activity.body.items[0].action).toBe('TASK_CREATED');
  });

  it('updates task status', async () => {
    const created = await request(app.getHttpServer())
      .post('/tasks')
      .send({
        title: 'Status Task',
        organizationId: 'org_1',
      })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/tasks/${created.body.id}/status`)
      .send({ status: TaskStatus.IN_PROGRESS })
      .expect(200);

    expect(updated.body.status).toBe(TaskStatus.IN_PROGRESS);
  });

  it('supports task dependencies and prevents circular dependencies', async () => {
    const taskA = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Task A', organizationId: 'org_1' })
      .expect(201);

    const taskB = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Task B', organizationId: 'org_1' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tasks/${taskB.body.id}/dependencies/${taskA.body.id}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/tasks/${taskA.body.id}/dependencies/${taskB.body.id}`)
      .expect(400);
  });

  it('bulk deletes tasks', async () => {
    const taskA = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Bulk A', organizationId: 'org_1' })
      .expect(201);

    const taskB = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Bulk B', organizationId: 'org_1' })
      .expect(201);

    const result = await request(app.getHttpServer())
      .post('/tasks/bulk-delete')
      .send({ ids: [taskA.body.id, taskB.body.id] })
      .expect(201);

    expect(result.body.count).toBe(2);
  });

  it('bulk updates task status', async () => {
    const taskA = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Bulk Status A', organizationId: 'org_1' })
      .expect(201);

    const taskB = await request(app.getHttpServer())
      .post('/tasks')
      .send({ title: 'Bulk Status B', organizationId: 'org_1' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/tasks/bulk-status')
      .send({ ids: [taskA.body.id, taskB.body.id], status: TaskStatus.DONE })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/tasks')
      .expect(200);

    const statuses = list.body.map((t: any) => t.status);
    expect(statuses).toEqual(expect.arrayContaining([TaskStatus.DONE]));
  });
});
