import { BrowserWindow, ipcMain } from 'electron';

import {
  type DeductionsDataApi,
  reviewStatuses,
  taxCategoryIds,
  type ReviewStatus,
  type TaxCategoryId,
} from '../shared/data';
import type { ImportFilesResult } from '../shared/imports';
import { ipcChannels } from '../shared/ipc';
import type { ProcessDocumentResult } from '../shared/processing';
import type { ExportInvoicesRequest } from '../shared/exports';
import {
  selectExportDirectory,
  selectImportFiles,
  selectSingleExportZipPath,
} from './dialogs';
import type { DocumentPreviewOpener } from './documents/documentPreviewOpener';
import type { InvoiceExporter } from './exports/invoiceExporter';
import {
  normalizeUpdateInvoiceItemReviewRequest,
  toUpdateInvoiceItemReviewRequest,
} from './data/reviewUpdateValidation';

const minimumTaxYear = 1900;
const maximumTaxYear = 2200;

const assertNoArguments = (channel: string, args: unknown[]) => {
  if (args.length > 0) {
    throw new Error(`${channel} does not accept arguments`);
  }
};

const assertOneArgument = (channel: string, args: unknown[]) => {
  if (args.length !== 1) {
    throw new Error(`${channel} expects exactly one argument`);
  }
};

const assertTwoArguments = (channel: string, args: unknown[]) => {
  if (args.length !== 2) {
    throw new Error(`${channel} expects exactly two arguments`);
  }
};

const readTaxYear = (channel: string, value: unknown) => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimumTaxYear ||
    value > maximumTaxYear
  ) {
    throw new Error(`${channel} received an invalid tax year`);
  }

  return value;
};

const readCategoryId = (channel: string, value: unknown): TaxCategoryId => {
  if (
    typeof value !== 'string' ||
    !taxCategoryIds.includes(value as TaxCategoryId)
  ) {
    throw new Error(`${channel} received an invalid category id`);
  }

  return value as TaxCategoryId;
};

const readReviewStatus = (channel: string, value: unknown): ReviewStatus => {
  if (
    typeof value !== 'string' ||
    !reviewStatuses.includes(value as ReviewStatus)
  ) {
    throw new Error(`${channel} received an invalid review status`);
  }

  return value as ReviewStatus;
};

const readNonEmptyString = (channel: string, value: unknown, label: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${channel} received an invalid ${label}`);
  }

  return value;
};

const readFilePaths = (channel: string, value: unknown) => {
  if (
    !Array.isArray(value) ||
    value.some((filePath) => typeof filePath !== 'string')
  ) {
    throw new Error(`${channel} received invalid file paths`);
  }

  return value.filter((filePath) => filePath.trim().length > 0);
};

const readExportInvoicesRequest = (
  channel: string,
  value: unknown,
): ExportInvoicesRequest => {
  if (!value || typeof value !== 'object' || !('years' in value)) {
    throw new Error(`${channel} received an invalid export request`);
  }

  const years = (value as { years: unknown }).years;

  if (!Array.isArray(years) || years.length === 0) {
    throw new Error(`${channel} received an empty year selection`);
  }

  return {
    years: [...new Set(years.map((year) => readTaxYear(channel, year)))],
  };
};

export type ImportFiles = (
  filePaths: string[],
) => Promise<Pick<ImportFilesResult, 'accepted' | 'skipped' | 'failed'>>;

export type ProcessDocument = (
  documentId: string,
) => Promise<ProcessDocumentResult>;

export const mergeImportResult = (
  selection: ImportFilesResult,
  importResult: Pick<ImportFilesResult, 'accepted' | 'skipped' | 'failed'>,
): ImportFilesResult => ({
  ...selection,
  ...importResult,
});

export const importSelectedFilePaths = async (
  filePaths: string[],
  importFiles?: ImportFiles,
): Promise<ImportFilesResult> => {
  const selection: ImportFilesResult = {
    canceled: false,
    filePaths,
    accepted: [],
    skipped: [],
    failed: [],
  };

  if (filePaths.length === 0 || !importFiles) {
    return selection;
  }

  return mergeImportResult(selection, await importFiles(filePaths));
};

export const registerDeductionsIpcHandlers = (
  data: DeductionsDataApi,
  importFiles?: ImportFiles,
  processDocument?: ProcessDocument,
  exporter?: InvoiceExporter,
  documentPreviewOpener?: DocumentPreviewOpener,
) => {
  ipcMain.handle(ipcChannels.imports.importFiles, async (event, ...args) => {
    assertNoArguments(ipcChannels.imports.importFiles, args);

    const selection = await selectImportFiles(
      BrowserWindow.fromWebContents(event.sender) ?? undefined,
    );

    if (selection.canceled || selection.filePaths.length === 0 || !importFiles) {
      return selection;
    }

    return mergeImportResult(
      selection,
      await importFiles(selection.filePaths),
    );
  });

  ipcMain.handle(ipcChannels.imports.importFilePaths, async (_event, ...args) => {
    assertOneArgument(ipcChannels.imports.importFilePaths, args);

    return importSelectedFilePaths(
      readFilePaths(ipcChannels.imports.importFilePaths, args[0]),
      importFiles,
    );
  });

  ipcMain.handle(ipcChannels.exports.listYearOptions, (_event, ...args) => {
    assertNoArguments(ipcChannels.exports.listYearOptions, args);

    if (!exporter) {
      throw new Error('Deductions export is not configured');
    }

    return exporter.listExportYearOptions();
  });

  ipcMain.handle(ipcChannels.exports.exportInvoices, async (event, ...args) => {
    assertOneArgument(ipcChannels.exports.exportInvoices, args);

    if (!exporter) {
      throw new Error('Deductions export is not configured');
    }

    const request = readExportInvoicesRequest(
      ipcChannels.exports.exportInvoices,
      args[0],
    );
    const browserWindow =
      BrowserWindow.fromWebContents(event.sender) ?? undefined;

    if (request.years.length === 1) {
      const selection = await selectSingleExportZipPath(
        request.years[0],
        browserWindow,
      );

      if (selection.canceled || !selection.filePath) {
        return { canceled: true, results: [] };
      }

      return exporter.exportInvoicesToTarget(request, {
        kind: 'single-file',
        filePath: selection.filePath,
      });
    }

    const selection = await selectExportDirectory(browserWindow);

    if (selection.canceled || !selection.directoryPath) {
      return { canceled: true, results: [] };
    }

    return exporter.exportInvoicesToTarget(request, {
      kind: 'directory',
      directoryPath: selection.directoryPath,
    });
  });

  ipcMain.handle(ipcChannels.data.listCategories, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.listCategories, args);

    return data.listCategories();
  });

  ipcMain.handle(ipcChannels.data.getAllYearsSummary, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.getAllYearsSummary, args);

    return data.getAllYearsSummary();
  });

  ipcMain.handle(ipcChannels.data.listTaxYears, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.listTaxYears, args);

    return data.listTaxYears();
  });

  ipcMain.handle(ipcChannels.data.getTaxYearSummary, (_event, ...args) => {
    assertOneArgument(ipcChannels.data.getTaxYearSummary, args);

    return data.getTaxYearSummary(
      readTaxYear(ipcChannels.data.getTaxYearSummary, args[0]),
    );
  });

  ipcMain.handle(
    ipcChannels.data.listInvoiceItemsByCategory,
    (_event, ...args) => {
      assertTwoArguments(ipcChannels.data.listInvoiceItemsByCategory, args);

      return data.listInvoiceItemsByCategory(
        readTaxYear(ipcChannels.data.listInvoiceItemsByCategory, args[0]),
        readCategoryId(ipcChannels.data.listInvoiceItemsByCategory, args[1]),
      );
    },
  );

  ipcMain.handle(
    ipcChannels.data.listInvoiceItemsByReviewStatus,
    (_event, ...args) => {
      assertOneArgument(
        ipcChannels.data.listInvoiceItemsByReviewStatus,
        args,
      );

      return data.listInvoiceItemsByReviewStatus(
        readReviewStatus(
          ipcChannels.data.listInvoiceItemsByReviewStatus,
          args[0],
        ),
      );
    },
  );

  ipcMain.handle(ipcChannels.data.getInvoiceItemById, (_event, ...args) => {
    assertOneArgument(ipcChannels.data.getInvoiceItemById, args);

    return data.getInvoiceItemById(
      readNonEmptyString(
        ipcChannels.data.getInvoiceItemById,
        args[0],
        'invoice item id',
      ),
    );
  });

  ipcMain.handle(
    ipcChannels.data.updateInvoiceItemReview,
    (_event, ...args) => {
      assertOneArgument(ipcChannels.data.updateInvoiceItemReview, args);

      return data.updateInvoiceItemReview(
        toUpdateInvoiceItemReviewRequest(
          normalizeUpdateInvoiceItemReviewRequest(
            ipcChannels.data.updateInvoiceItemReview,
            args[0],
          ),
        ),
      );
    },
  );

  ipcMain.handle(ipcChannels.data.getInvoiceById, (_event, ...args) => {
    assertOneArgument(ipcChannels.data.getInvoiceById, args);

    return data.getInvoiceById(
      readNonEmptyString(
        ipcChannels.data.getInvoiceById,
        args[0],
        'invoice id',
      ),
    );
  });

  ipcMain.handle(ipcChannels.data.listDocumentSummaries, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.listDocumentSummaries, args);

    return data.listDocumentSummaries();
  });

  ipcMain.handle(ipcChannels.data.getDocumentDetail, (_event, ...args) => {
    assertOneArgument(ipcChannels.data.getDocumentDetail, args);

    return data.getDocumentDetail(
      readNonEmptyString(
        ipcChannels.data.getDocumentDetail,
        args[0],
        'document id',
      ),
    );
  });

  ipcMain.handle(ipcChannels.data.deleteDocument, (_event, ...args) => {
    assertOneArgument(ipcChannels.data.deleteDocument, args);

    return data.deleteDocument(
      readNonEmptyString(
        ipcChannels.data.deleteDocument,
        args[0],
        'document id',
      ),
    );
  });

  ipcMain.handle(ipcChannels.data.listSources, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.listSources, args);

    return data.listSources();
  });

  ipcMain.handle(
    ipcChannels.documents.openDocumentPreview,
    (_event, ...args) => {
      assertOneArgument(ipcChannels.documents.openDocumentPreview, args);

      if (!documentPreviewOpener) {
        throw new Error('Document preview is not configured.');
      }

      return documentPreviewOpener.openDocumentPreview(
        readNonEmptyString(
          ipcChannels.documents.openDocumentPreview,
          args[0],
          'document id',
        ),
      );
    },
  );

  ipcMain.handle(ipcChannels.processing.processDocument, (_event, ...args) => {
    assertOneArgument(ipcChannels.processing.processDocument, args);

    if (!processDocument) {
      throw new Error('Document processing is not configured.');
    }

    return processDocument(
      readNonEmptyString(
        ipcChannels.processing.processDocument,
        args[0],
        'document id',
      ),
    );
  });
};
