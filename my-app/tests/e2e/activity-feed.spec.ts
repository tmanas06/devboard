import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocks';

test.describe('Activity Feed', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test('activity appears after creating a task', async ({ page }) => {
    const taskTitle = `Activity Task ${Date.now()}`;

    await page.goto('/dashboard/tasks');
    await page.getByRole('button', { name: 'New Task' }).click();
    await page.getByRole('dialog').getByLabel('Title').fill(taskTitle);
    await page.getByRole('dialog').getByRole('button', { name: 'Create Task' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.goto('/dashboard/activity');

    await expect(page.getByText('created a task')).toBeVisible();
    await expect(page.getByText(taskTitle)).toBeVisible();
  });
});
