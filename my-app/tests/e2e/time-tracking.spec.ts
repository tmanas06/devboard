import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocks';

test.describe('Time Tracking', () => {
  test('user logs a time entry', async ({ page }) => {
    const description = `Playwright entry ${Date.now()}`;

    await setupApiMocks(page);

    await page.goto('/dashboard/time-entries');
    await page.getByRole('button', { name: 'Log Time' }).first().click();

    const dialog = page.getByRole('dialog');

    await dialog.getByLabel('Date').fill('2026-03-09');
    await dialog.getByLabel('Start Time').fill('09:00');
    await dialog.getByLabel('End Time').fill('10:00');
    await dialog.getByLabel('Hours').fill('1');
    await dialog.getByLabel('Description').fill(description);

    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/time-entries') && resp.request().method() === 'POST'),
      dialog.getByRole('button', { name: 'Log Time' }).click(),
    ]);

    await expect(page.getByRole('dialog')).toHaveCount(0);

    const entriesCard = page.getByText('Entries', { exact: true }).locator('..').locator('..').first();
    const totalCard = page.getByText('Total Hours', { exact: true }).locator('..').locator('..').first();

    await expect(entriesCard).toContainText('1');
    await expect(totalCard).toContainText('1h');
  });

  test('overlapping entry shows validation error', async ({ page }) => {
    await setupApiMocks(page);

    await page.goto('/dashboard/time-entries');

    await page.getByRole('button', { name: 'Log Time' }).click();
    const firstDialog = page.getByRole('dialog');
    await firstDialog.getByLabel('Date').fill('2026-03-09');
    await firstDialog.getByLabel('Start Time').fill('11:00');
    await firstDialog.getByLabel('End Time').fill('12:00');
    await firstDialog.getByLabel('Hours').fill('1');
    await firstDialog.getByRole('button', { name: 'Log Time' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.getByRole('button', { name: 'Log Time' }).first().click();
    const secondDialog = page.getByRole('dialog');
    await secondDialog.getByLabel('Date').fill('2026-03-09');
    await secondDialog.getByLabel('Start Time').fill('11:30');
    await secondDialog.getByLabel('End Time').fill('12:30');
    await secondDialog.getByLabel('Hours').fill('1');
    await secondDialog.getByRole('button', { name: 'Log Time' }).click();

    await expect(page.getByText('Time entry overlaps with an existing entry', { exact: true }).first()).toBeVisible({ timeout: 10000 });
  });
});
