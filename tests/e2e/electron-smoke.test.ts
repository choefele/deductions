import { _electron as electron, expect, test } from '@playwright/test';

test('opens the Deductions shell and exposes the preload API', async () => {
  const electronApp = await electron.launch({ args: ['.'] });

  try {
    const page = await electronApp.firstWindow();

    await expect(page.getByRole('heading', { name: 'Deductions' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Open files' })).toBeVisible();

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
