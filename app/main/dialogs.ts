import {
  dialog,
  type BrowserWindow,
  type OpenDialogOptions,
  type SaveDialogOptions,
} from 'electron';

import type { ImportFilesResult } from '../shared/imports';

export const selectImportFiles = async (
  browserWindow?: BrowserWindow,
): Promise<ImportFilesResult> => {
  const options: OpenDialogOptions = {
    title: 'Choose invoices',
    filters: [{ name: 'PDF invoices', extensions: ['pdf'] }],
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

export const selectSingleExportZipPath = async (
  year: number,
  browserWindow?: BrowserWindow,
) => {
  const options: SaveDialogOptions = {
    title: 'Export invoices',
    defaultPath: `Deductions-export-${year}.zip`,
    filters: [{ name: 'Zip package', extensions: ['zip'] }],
  };

  const result = browserWindow
    ? await dialog.showSaveDialog(browserWindow, options)
    : await dialog.showSaveDialog(options);

  return {
    canceled: result.canceled,
    filePath: result.filePath,
  };
};

export const selectExportDirectory = async (
  browserWindow?: BrowserWindow,
) => {
  const options: OpenDialogOptions = {
    title: 'Choose export folder',
    properties: ['openDirectory', 'createDirectory'],
  };

  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, options)
    : await dialog.showOpenDialog(options);

  return {
    canceled: result.canceled,
    directoryPath: result.filePaths[0],
  };
};
