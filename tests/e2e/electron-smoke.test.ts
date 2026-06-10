import { _electron as electron, expect, test } from '@playwright/test';

test('opens the Deductions shell and exposes the preload API', async () => {
  const electronApp = await electron.launch({ args: ['.'] });

  try {
    const page = await electronApp.firstWindow();

    await expect(
      page.getByRole('heading', { name: 'All-years dashboard' }),
    ).toBeVisible();
    const sidebar = page.getByRole('complementary');
    await expect(sidebar.getByText('Review', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Tax years', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Import invoice' }),
    ).toBeVisible();

    await sidebar.getByRole('link', { name: /2025/ }).click();
    await expect(
      page.getByRole('heading', { name: '2025 dashboard' }),
    ).toBeVisible();

    await sidebar
      .getByRole('link', { name: /Work-related expenses/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Work-related expenses' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Apple Store' }).click();
    await expect(page.getByRole('heading', { name: 'Apple Store' })).toBeVisible();

    const apiShape = await page.evaluate(() => ({
      hasDeductionsApi: typeof window.deductions === 'object',
      hasOpenFiles: typeof window.deductions.openFiles === 'function',
      platform: window.deductions.appInfo.platform,
      version: window.deductions.appInfo.version,
      hasNodeRequire: typeof Reflect.get(window, 'require') === 'function',
    }));

    expect(apiShape).toMatchObject({
      hasDeductionsApi: true,
      hasOpenFiles: true,
      hasNodeRequire: false,
    });
    expect(apiShape.platform.length).toBeGreaterThan(0);
    expect(apiShape.version.length).toBeGreaterThan(0);
  } finally {
    await electronApp.close();
  }
});
