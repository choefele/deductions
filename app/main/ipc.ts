import { BrowserWindow, ipcMain } from 'electron';

import {
  reviewStatuses,
  taxCategoryIds,
  type DeductionsDataApi,
  type ReviewStatus,
  type TaxCategoryId,
} from '../shared/deductions';
import { ipcChannels } from '../shared/ipc';
import { openFiles } from './dialogs';

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

export const registerDeductionsIpcHandlers = (data: DeductionsDataApi) => {
  ipcMain.handle(ipcChannels.openFiles, (event, ...args) => {
    assertNoArguments(ipcChannels.openFiles, args);

    return openFiles(BrowserWindow.fromWebContents(event.sender) ?? undefined);
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

  ipcMain.handle(ipcChannels.data.listSources, (_event, ...args) => {
    assertNoArguments(ipcChannels.data.listSources, args);

    return data.listSources();
  });
};
