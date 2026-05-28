import { BrowserWindow, ipcMain } from 'electron';

import { ipcChannels } from '../shared/ipc';
import { openFiles } from './dialogs';

export const registerIpcHandlers = () => {
  ipcMain.handle(ipcChannels.openFiles, (event, ...args) => {
    if (args.length > 0) {
      throw new Error(`${ipcChannels.openFiles} does not accept arguments`);
    }

    return openFiles(BrowserWindow.fromWebContents(event.sender) ?? undefined);
  });
};
