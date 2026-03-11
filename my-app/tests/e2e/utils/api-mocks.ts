import type { Page, Route } from '@playwright/test';

type TaskRecord = {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  organizationId?: string;
};

type TimeEntryRecord = {
  id: string;
  startTime: string;
  endTime: string;
  hours: number;
  description?: string;
  userId?: string;
  organizationId?: string;
};

type ActivityRecord = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
};

const json = (data: any) => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

const created = (data: any) => ({
  status: 201,
  contentType: 'application/json',
  body: JSON.stringify(data),
});

const badRequest = (message: string) => ({
  status: 400,
  contentType: 'application/json',
  body: JSON.stringify({ message }),
});

const readBody = async (route: Route) => {
  const request = route.request();
  const postData = request.postData();
  return postData ? JSON.parse(postData) : {};
};

export async function setupApiMocks(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem('devboard-selected-org', 'org_1');
    window.localStorage.setItem('devboard-e2e', 'true');
  });

  const isApiRequest = (url: string) => {
    try {
      const parsed = new URL(url);
      const isApi = parsed.hostname === 'localhost' && (parsed.port === '3001' || parsed.pathname.startsWith('/api'));
      return isApi;
    } catch {
      return false;
    }
  };

  let taskId = 1;
  let timeEntryId = 1;
  let activityId = 1;

  const tasks: TaskRecord[] = [
    { id: 'task-seed', title: 'Seed Task', status: 'TODO', priority: 'MEDIUM', organizationId: 'org_1' }
  ];
  const timeEntries: TimeEntryRecord[] = [];
  const activities: ActivityRecord[] = [];

  await page.route('**/time-entries/reports/export**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    const url = new URL(route.request().url());
    const format = url.searchParams.get('format');

    if (format === 'pdf') {
      await route.fulfill({
        status: 200,
        body: Buffer.from('%PDF-1.4 mock content'),
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="time-entries.pdf"',
        },
      });
      return;
    }

    const csv = [
      'Date,Start Time,End Time,Hours,Description',
      '2026-03-09,2026-03-09T09:00:00.000Z,2026-03-09T10:00:00.000Z,1,Mock entry',
    ].join('\n');

    await route.fulfill({
      status: 200,
      body: csv,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="time-entries.csv"',
      },
    });
  });

  await page.route('**/time-entries/reports/summary**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0);
    await route.fulfill(json({
      summary: { totalHours, entriesCount: timeEntries.length },
      byUser: [],
      byTask: [],
    }));
  });

  await page.route('**/time-entries**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;

    if (pathname.endsWith('/time-entries') && request.method() === 'GET') {
      await route.fulfill(json(timeEntries));
      return;
    }

    if (pathname.endsWith('/time-entries') && request.method() === 'POST') {
      const body = await readBody(route);
      const start = new Date(body.startTime);
      const end = new Date(body.endTime);
      const hasOverlap = timeEntries.some((entry) =>
        start < new Date(entry.endTime) && end > new Date(entry.startTime),
      );

      if (hasOverlap) {
        await route.fulfill(badRequest('Time entry overlaps with an existing entry'));
        return;
      }

      const entry: TimeEntryRecord = {
        id: `time_${timeEntryId++}`,
        startTime: body.startTime,
        endTime: body.endTime,
        hours: body.hours || 1,
        description: body.description,
        userId: 'user_1',
        organizationId: 'org_1',
      };
      timeEntries.unshift(entry);
      await route.fulfill(created(entry));
      return;
    }

    await route.fallback();
  });

  await page.route('**/activity**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    if (route.request().method() === 'GET') {
      await route.fulfill(json({
        items: activities,
        total: activities.length,
        page: 1,
        limit: 30,
        totalPages: 1,
      }));
      return;
    }

    await route.fallback();
  });

  await page.route('**/users/me**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    await route.fulfill(json({
      id: 'e2e-user',
      email: 'test@example.com',
      firstName: 'Cyber',
      lastName: 'Test',
      organizations: [
        { id: 'org_1', name: 'Test Org', slug: 'test-org', role: 'ORG_ADMIN' }
      ]
    }));
  });

  await page.route('**/users**', async (route) => {
    if (!isApiRequest(route.request().url()) || route.request().url().includes('/me')) {
      await route.fallback();
      return;
    }
    await route.fulfill(json([
      { id: 'user_1', firstName: 'Test', lastName: 'User', email: 'test@example.com', role: 'ORG_ADMIN' }
    ]));
  });

  await page.route('**/tasks**', async (route) => {
    if (!isApiRequest(route.request().url())) {
      await route.fallback();
      return;
    }
    const request = route.request();
    const url = new URL(request.url());
    const pathname = url.pathname;


    if (pathname.endsWith('/tasks') && request.method() === 'GET') {
      await route.fulfill(json(tasks));
      return;
    }

    if (pathname.endsWith('/tasks') && request.method() === 'POST') {
      const body = await readBody(route);
      const task: TaskRecord = {
        id: `task_${taskId++}`,
        title: body.title,
        description: body.description,
        status: body.status || 'TODO',
        priority: body.priority || 'MEDIUM',
        organizationId: body.organizationId || 'org_1',
      };
      tasks.unshift(task);
      activities.unshift({
        id: `activity_${activityId++}`,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: task.id,
        metadata: { title: task.title },
        createdAt: new Date().toISOString(),
        user: { id: 'user_1', firstName: 'Test', lastName: 'User', email: 'test@example.com' },
      });
      await route.fulfill(created(task));
      return;
    }

    if (pathname.endsWith('/tasks/bulk-delete') && request.method() === 'POST') {
      const body = await readBody(route);
      const ids: string[] = body.ids || [];
      const remaining = tasks.filter((t) => !ids.includes(t.id));
      const count = tasks.length - remaining.length;
      tasks.splice(0, tasks.length, ...remaining);
      await route.fulfill(created({ count }));
      return;
    }

    if (pathname.endsWith('/tasks/bulk-status') && request.method() === 'POST') {
      const body = await readBody(route);
      const ids: string[] = body.ids || [];
      tasks.forEach((t) => {
        if (ids.includes(t.id)) t.status = body.status;
      });
      await route.fulfill(created({ count: ids.length }));
      return;
    }

    if (pathname.includes('/tasks/') && request.method() === 'PATCH') {
      const body = await readBody(route);
      const id = pathname.split('/').pop() as string;
      const task = tasks.find((t) => t.id === id);
      if (task && body.status) {
        task.status = body.status;
      }
      await route.fulfill(json(task || {}));
      return;
    }

    await route.fallback();
  });

}
