import { contextBridge, ipcRenderer } from 'electron';

import { ipcChannels, type DeductionsBridgeApi } from '../shared/ipc';

const deductionsBridge: DeductionsBridgeApi = {
  appInfo: {
    platform: process.platform,
    version: process.versions.electron,
  },
  imports: {
    importFiles: () =>
      ipcRenderer.invoke(ipcChannels.imports.importFiles),
  },
  data: {
    listCategories: () =>
      ipcRenderer.invoke(ipcChannels.data.listCategories),
    getAllYearsSummary: () =>
      ipcRenderer.invoke(ipcChannels.data.getAllYearsSummary),
    listTaxYears: () =>
      ipcRenderer.invoke(ipcChannels.data.listTaxYears),
    getTaxYearSummary: (year) =>
      ipcRenderer.invoke(ipcChannels.data.getTaxYearSummary, year),
    listInvoiceItemsByCategory: (year, categoryId) =>
      ipcRenderer.invoke(
        ipcChannels.data.listInvoiceItemsByCategory,
        year,
        categoryId,
      ),
    listInvoiceItemsByReviewStatus: (reviewStatus) =>
      ipcRenderer.invoke(
        ipcChannels.data.listInvoiceItemsByReviewStatus,
        reviewStatus,
      ),
    getInvoiceItemById: (invoiceItemId) =>
      ipcRenderer.invoke(ipcChannels.data.getInvoiceItemById, invoiceItemId),
    getInvoiceById: (invoiceId) =>
      ipcRenderer.invoke(ipcChannels.data.getInvoiceById, invoiceId),
    listSources: () => ipcRenderer.invoke(ipcChannels.data.listSources),
  },
};

contextBridge.exposeInMainWorld('deductions', deductionsBridge);
