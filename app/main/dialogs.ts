import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';

import type { ImportFilesResult } from '../shared/imports';

export const selectImportFiles = async (
  browserWindow?: BrowserWindow,
): Promise<ImportFilesResult> => {
  const options: OpenDialogOptions = {
    title: 'Choose invoices',
    properties: ['openFile', 'multiSelections'],
  };

  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, options)
    : await dialog.showOpenDialog(options);

  return {
    canceled: result.canceled,
    filePaths: result.filePaths,
    accepted: [],
    skipped: [],
    failed: [],
  };
};
