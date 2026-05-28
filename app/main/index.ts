import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createWindow } from './createWindow';
import { registerIpcHandlers } from './ipc';
import { buildMenu } from './menu';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

app.whenReady().then(() => {
  app.name = 'Deductions';
  registerIpcHandlers();
  buildMenu();
  createWindow();
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
