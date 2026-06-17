import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createWindow } from './createWindow';
import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from './data/database';
import { importDocuments } from './data/importDocuments';
import type { ImportFiles, ProcessDocument } from './ipc';
import { registerDeductionsIpcHandlers } from './ipc';
import { buildMenu } from './menu';
import { ipcChannels } from '../shared/ipc';
import { InvoiceExporter } from './exports/invoiceExporter';
import { AiSdkInvoiceParser } from './processing/aiSdkInvoiceParser';
import { resolveAiProviderSettings } from './processing/aiProviderSettings';
import { DocumentProcessingQueue } from './processing/documentProcessingQueue';
import { PdfJsDocumentTextExtractor } from './processing/pdfTextExtractor';

let databaseHandle: DeductionsDatabaseHandle | null = null;
let processingQueue: DocumentProcessingQueue | null = null;
let isDataInitialized = false;

const broadcastDocumentsChanged = () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send(ipcChannels.processing.documentsChanged);
  });
};

const importFiles: ImportFiles = async (filePaths) => {
  if (!databaseHandle) {
    throw new Error('Deductions data is not initialized');
  }

  const result = await importDocuments({
    db: databaseHandle.db,
    profileDirectory: databaseHandle.profileDirectory,
    sourceId: databaseHandle.manualUploadSourceId,
    filePaths,
  });

  result.accepted.forEach((accepted) => {
    processingQueue?.enqueue(accepted.documentId);
  });

  return result;
};

const processDocument: ProcessDocument = async (documentId) => {
  if (!processingQueue) {
    throw new Error('Document processing is not configured.');
  }

  return {
    documentId,
    enqueued: processingQueue.enqueue(documentId),
  };
};

const createProcessingQueue = (
  handle: DeductionsDatabaseHandle,
): DocumentProcessingQueue | null => {
  const settings = resolveAiProviderSettings();

  if (!settings) {
    return null;
  }

  return new DocumentProcessingQueue({
    db: handle.db,
    profileDirectory: handle.profileDirectory,
    extractor: new PdfJsDocumentTextExtractor(),
    parser: new AiSdkInvoiceParser(settings),
    onDocumentsChanged: broadcastDocumentsChanged,
  });
};

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
    processingQueue = createProcessingQueue(databaseHandle);
    processingQueue?.recoverInterruptedDocuments();
    registerDeductionsIpcHandlers(
      databaseHandle.data,
      importFiles,
      processDocument,
      new InvoiceExporter(databaseHandle.db, databaseHandle.profileDirectory),
    );
    isDataInitialized = true;
    buildMenu(importFiles);
    createWindow();
  })
  .catch((error: unknown) => {
    console.error('Failed to initialize Deductions main process', error);
    app.quit();
  });

app.on('before-quit', () => {
  databaseHandle?.close();
  databaseHandle = null;
  processingQueue = null;
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
