import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocks';

test.describe('Bulk Operations', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log(`[BROWSER][${msg.type()}] ${msg.text()}`));
    await setupApiMocks(page);
  });

  test('user selects multiple tasks and bulk deletes them', async ({ page }) => {
    const taskA = `Bulk A ${Date.now()}`;
    const taskB = `Bulk B ${Date.now()}`;

    await page.goto('/dashboard/tasks');
    await page.getByRole('button', { name: 'List' }).click();

    await page.getByRole('button', { name: 'New Task' }).click();
    const dialogA = page.getByRole('dialog');
    await dialogA.getByLabel('Title').fill(taskA);
    // Fill required fields
    await dialogA.getByLabel(/Due Date/i).fill('2026-12-31');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/tasks') && resp.request().method() === 'POST'),
      dialogA.getByRole('button', { name: 'Create Task' }).click(),
    ]);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'New Task' }).click();
    const dialogB = page.getByRole('dialog');
    await dialogB.getByLabel('Title').fill(taskB);
    // Fill required fields
    await dialogB.getByLabel(/Due Date/i).fill('2026-12-31');
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/tasks') && resp.request().method() === 'POST'),
      dialogB.getByRole('button', { name: 'Create Task' }).click(),
    ]);
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // List view should already be active, but let's ensure it's settled
    await expect(page.getByRole('button', { name: 'List' })).toBeVisible();

    const cardA = page.locator('[data-slot="card"]').filter({ hasText: taskA }).first();
    const cardB = page.locator('[data-slot="card"]').filter({ hasText: taskB }).first();

    await expect(cardA).toBeVisible({ timeout: 15000 });
    await expect(cardB).toBeVisible({ timeout: 15000 });

    await cardA.locator('[data-slot="checkbox"]').click({ force: true });
    await cardB.locator('[data-slot="checkbox"]').click({ force: true });

    // Wait for the toolbar to show the selection count
    // (1 Seeded task + 2 Created tasks = 3 Total)
    await expect(page.getByText(/2 of 3 selected/i)).toBeVisible({ timeout: 10000 });

    const toolbar = page.locator('div').filter({ hasText: 'selected' }).first();
    await toolbar.getByRole('button', { name: 'Delete' }).click();

    // Wait for the confirmation dialog and click the Delete button inside it
    const dialog = page.getByRole('alertdialog').last();
    await expect(dialog).toContainText(/Delete 2 tasks/i);
    await dialog.getByRole('button', { name: 'Delete' }).click();

    await expect(page.getByText(taskA)).toHaveCount(0);
    await expect(page.getByText(taskB)).toHaveCount(0);
  });
});
