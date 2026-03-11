import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocks';

test.describe('Export', () => {
  test('user exports CSV from reports', async ({ page }) => {
    await setupApiMocks(page);

    await page.goto('/dashboard/reports');

    await page.getByRole('button', { name: 'Export' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'Export as CSV' }).click(),
    ]);

    const filename = await download.suggestedFilename();
    expect(filename).toContain('.csv');
  });

  test('user exports PDF from reports', async ({ page }) => {
    await setupApiMocks(page);

    await page.goto('/dashboard/reports');

    await page.getByRole('button', { name: 'Export' }).click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'Export as PDF' }).click(),
    ]);

    const filename = await download.suggestedFilename();
    expect(filename).toContain('.pdf');
  });
});
