import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

test('deleting a document stays on the documents view', async () => {
  const userDataDirectory = mkdtempSync(join(tmpdir(), 'deductions-e2e-'));
  const electronApp = await electron.launch({
    args: ['.', `--user-data-dir=${userDataDirectory}`],
  });

  try {
    const page = await electronApp.firstWindow();
    const documentName = 'apple-store-2025-02-14.pdf';

    await page
      .getByRole('complementary', { name: 'Primary navigation' })
      .getByRole('link', { name: 'Documents' })
      .click();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByText(documentName)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page
      .getByRole('button', { name: `Actions for ${documentName}` })
      .click();
    await page.getByRole('menuitem', { name: 'Delete' }).click();

    await expect(page).toHaveURL(/#\/documents$/);
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByText(documentName)).toHaveCount(0);
  } finally {
    await electronApp.close();
    rmSync(userDataDirectory, { recursive: true, force: true });
  }
});
