import { contextBridge, ipcRenderer } from 'electron';

import { ipcChannels, type DeductionsApi } from '../shared/ipc';

const deductionsApi: DeductionsApi = {
  appInfo: {
    platform: process.platform,
    version: process.versions.electron,
  },
  openFiles: () => ipcRenderer.invoke(ipcChannels.openFiles),
};

contextBridge.exposeInMainWorld('deductions', deductionsApi);
