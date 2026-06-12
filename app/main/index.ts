import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createWindow } from './createWindow';
import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from './data/database';
import { registerIpcHandlers } from './ipc';
import { buildMenu } from './menu';

let databaseHandle: DeductionsDatabaseHandle | null = null;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

app.whenReady().then(() => {
  app.name = 'Deductions';
  databaseHandle = initializeDeductionsDatabase({
    appDataDirectory: app.getPath('userData'),
  });
  registerIpcHandlers();
  buildMenu();
  createWindow();
});

app.on('before-quit', () => {
  databaseHandle?.close();
  databaseHandle = null;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
