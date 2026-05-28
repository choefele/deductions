import { dialog, type BrowserWindow, type OpenDialogOptions } from 'electron';

import type { OpenFilesResult } from '../shared/ipc';

export const openFiles = async (
  browserWindow?: BrowserWindow,
): Promise<OpenFilesResult> => {
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
  };
};
