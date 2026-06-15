import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createWindow } from './createWindow';
import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from './data/database';
import { registerDeductionsIpcHandlers } from './ipc';
import { buildMenu } from './menu';

let databaseHandle: DeductionsDatabaseHandle | null = null;
let isDataInitialized = false;

// Avoid macOS Keychain prompts from Chromium safe storage while Forge runs the
// stock Electron binary in development. Packaged builds use configured fuses.
if (!app.isPackaged && process.platform === 'darwin') {
  app.commandLine.appendSwitch('use-mock-keychain');
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

app.whenReady()
  .then(() => {
    app.name = 'Deductions';
    databaseHandle = initializeDeductionsDatabase({
      appDataDirectory: app.getPath('userData'),
    });
    registerDeductionsIpcHandlers(databaseHandle.data);
    isDataInitialized = true;
    buildMenu();
    createWindow();
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize Deductions main process', error);
    app.quit();
  });

app.on('before-quit', () => {
  databaseHandle?.close();
  databaseHandle = null;
  isDataInitialized = false;
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (isDataInitialized && BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
