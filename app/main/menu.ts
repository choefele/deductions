import { app, BrowserWindow, Menu, type MenuItemConstructorOptions } from 'electron';

import { selectImportFiles } from './dialogs';
import type { ImportFiles } from './ipc';

export const buildMenu = (importFiles?: ImportFiles) => {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [];

  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  template.push(
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Files...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const selection = await selectImportFiles(
              BrowserWindow.getFocusedWindow() ?? undefined,
            );

            if (
              !selection.canceled &&
              selection.filePaths.length > 0 &&
              importFiles
            ) {
              await importFiles(selection.filePaths);
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' } satisfies MenuItemConstructorOptions,
              { role: 'front' } satisfies MenuItemConstructorOptions,
              { type: 'separator' } satisfies MenuItemConstructorOptions,
              { role: 'window' } satisfies MenuItemConstructorOptions,
            ]
          : [{ role: 'close' } satisfies MenuItemConstructorOptions]),
      ],
    },
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};
