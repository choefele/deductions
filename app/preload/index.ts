import { contextBridge, ipcRenderer, webUtils } from 'electron';

import type { ImportFilesResult } from '../shared/imports';
import { ipcChannels, type DeductionsBridgeApi } from '../shared/ipc';

const deductionsBridge: DeductionsBridgeApi = {
  appInfo: {
    platform: process.platform,
    version: process.versions.electron,
  },
  imports: {
    importFiles: () =>
      ipcRenderer.invoke(ipcChannels.imports.importFiles),
    importFilePaths: (filePaths) =>
      ipcRenderer.invoke(ipcChannels.imports.importFilePaths, filePaths),
    getPathForFile: (file) => webUtils.getPathForFile(file),
    onImportCompleted: (listener) => {
      const handler = (_event: Electron.IpcRendererEvent, result: unknown) => {
        listener(result as ImportFilesResult);
      };

      ipcRenderer.on(ipcChannels.imports.importCompleted, handler);

      return () => {
        ipcRenderer.removeListener(
          ipcChannels.imports.importCompleted,
          handler,
        );
      };
    },
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
    listDocumentSummaries: () =>
      ipcRenderer.invoke(ipcChannels.data.listDocumentSummaries),
    getDocumentDetail: (documentId) =>
      ipcRenderer.invoke(ipcChannels.data.getDocumentDetail, documentId),
    listSources: () => ipcRenderer.invoke(ipcChannels.data.listSources),
  },
  processing: {
    processDocument: (documentId) =>
      ipcRenderer.invoke(ipcChannels.processing.processDocument, documentId),
    onDocumentsChanged: (listener) => {
      const handler = () => {
        listener();
      };

      ipcRenderer.on(ipcChannels.processing.documentsChanged, handler);

      return () => {
        ipcRenderer.removeListener(
          ipcChannels.processing.documentsChanged,
          handler,
        );
      };
    },
  },
};

contextBridge.exposeInMainWorld('deductions', deductionsBridge);
