import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

test('opens the Deductions shell and exposes the preload API', async () => {
  const userDataDirectory = mkdtempSync(join(tmpdir(), 'deductions-e2e-'));
  const electronApp = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDirectory}`],
  });

  try {
    const page = await electronApp.firstWindow();

    await expect(
      page.getByRole('heading', { name: 'All years' }),
    ).toBeVisible();
    const sidebar = page.getByRole('complementary', {
      name: 'Primary navigation',
    });
    await expect(sidebar.getByText('All years', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Tax years', { exact: true })).toBeVisible();
    await expect(sidebar.getByText('Documents', { exact: true })).toBeVisible();
    await expect(
      page
        .locator('[data-sidebar="menu-button"][data-active="false"]')
        .first(),
    ).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(
      page.getByRole('button', { name: 'Import invoice' }),
    ).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Overview' })).toHaveCount(1);
    await expect(sidebar.getByRole('button', { name: /2025/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    await page.locator('main a[href="#/years/2024"]').click();
    await expect(
      page.getByRole('heading', { name: '2024 overview' }),
    ).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Overview' })).toHaveCount(1);
    await expect(sidebar.getByRole('button', { name: /2024/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(sidebar.getByRole('button', { name: /2025/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await sidebar.getByRole('button', { name: /2025/ }).click();
    await expect(sidebar.getByRole('button', { name: /2025/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(sidebar.getByRole('button', { name: /2024/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(
      page.getByRole('heading', { name: '2024 overview' }),
    ).toBeVisible();
    await sidebar.getByRole('link', { name: 'Overview' }).click();
    await expect(
      page.getByRole('heading', { name: '2025 overview' }),
    ).toBeVisible();

    await page
      .getByRole('link', { name: /Work-related expenses/ })
      .first()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Work-related expenses' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Apple Store' }).click();
    await expect(page.getByRole('heading', { name: 'Apple Store' })).toBeVisible();

    await page.getByRole('button', { name: 'Toggle Sidebar' }).click();
    await expect(page.locator('[data-slot="sidebar"]')).toHaveAttribute(
      'data-collapsible',
      'offcanvas',
    );

    const apiShape = await page.evaluate(() => ({
      hasDeductionsApi: typeof window.deductions === 'object',
      hasImportsApi: typeof window.deductions.imports === 'object',
      hasImportFiles:
        typeof window.deductions.imports.importFiles === 'function',
      hasDataApi: typeof window.deductions.data === 'object',
      hasListTaxYears:
        typeof window.deductions.data.listTaxYears === 'function',
      platform: window.deductions.appInfo.platform,
      version: window.deductions.appInfo.version,
      hasNodeRequire: typeof Reflect.get(window, 'require') === 'function',
    }));
    const taxYears = await page.evaluate(() =>
      window.deductions.data.listTaxYears(),
    );

    expect(apiShape).toMatchObject({
      hasDeductionsApi: true,
      hasImportsApi: true,
      hasImportFiles: true,
      hasDataApi: true,
      hasListTaxYears: true,
      hasNodeRequire: false,
    });
    expect(apiShape.platform.length).toBeGreaterThan(0);
    expect(apiShape.version.length).toBeGreaterThan(0);
    expect(taxYears.map((year) => year.year)).toContain(2025);
  } finally {
    await electronApp.close();
    rmSync(userDataDirectory, { recursive: true, force: true });
  }
});
