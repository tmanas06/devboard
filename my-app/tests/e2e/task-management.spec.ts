import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocks';

test.describe('Task Management', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('user creates a task and sees it in the list', async ({ page }) => {
    const taskTitle = `E2E Task ${Date.now()}`;

    await page.goto('/dashboard/tasks');
    await page.getByRole('button', { name: 'List' }).click();

    await page.getByRole('button', { name: 'New Task' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Title').fill(taskTitle);
    await dialog.getByLabel('Description').fill('Created by Playwright');

    // Fill required fields based on browser inspection
    await dialog.getByLabel(/Due Date/i).fill('2026-12-31');
    // For assignee, try to find the dropdown or input
    const assigneeField = dialog.getByText(/Select team members|Assignee/i);
    if (await assigneeField.isVisible()) {
      await assigneeField.click();
      await page.keyboard.type('Test User');
      await page.keyboard.press('Enter');
    }

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/tasks') && resp.request().method() === 'POST'),
      dialog.getByRole('button', { name: 'Create Task' }).click(),
    ]);

    // Wait for the dialog to disappear
    await expect(page.getByRole('dialog')).toHaveCount(0);

    // Ensure we are in List view
    await page.getByRole('button', { name: 'List' }).click();

    // Use locator for the task card by title text
    const taskCard = page.locator('[data-slot="card"]').filter({ hasText: taskTitle }).first();
    await expect(taskCard).toBeVisible({ timeout: 15000 });
  });

  test('user updates task status on the board', async ({ page }) => {
    await page.goto('/dashboard/tasks');
    const boardButton = page.getByRole('button', { name: /Board|Kanban/i }).first();
    await boardButton.click();

    // Verify tasks are visible in the board columns (Case-insensitive)
    await expect(page.locator('h3').getByText(/To Do/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3').getByText(/In Progress/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3').getByText(/Done/i)).toBeVisible({ timeout: 15000 });
  });
});
