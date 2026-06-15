import type { DeductionsDataApi } from './data';
import type { DeductionsImportsApi } from './imports';

export const ipcChannels = {
  imports: {
    importFiles: 'deductions:imports:import-files',
  },
  data: {
    listCategories: 'deductions:data:list-categories',
    getAllYearsSummary: 'deductions:data:get-all-years-summary',
    listTaxYears: 'deductions:data:list-tax-years',
    getTaxYearSummary: 'deductions:data:get-tax-year-summary',
    listInvoiceItemsByCategory: 'deductions:data:list-invoice-items-by-category',
    listInvoiceItemsByReviewStatus:
      'deductions:data:list-invoice-items-by-review-status',
    getInvoiceItemById: 'deductions:data:get-invoice-item-by-id',
    getInvoiceById: 'deductions:data:get-invoice-by-id',
    listSources: 'deductions:data:list-sources',
  },
} as const;

export type DeductionsBridgeApi = {
  appInfo: {
    platform: NodeJS.Platform;
    version: string;
  };
  imports: DeductionsImportsApi;
  data: DeductionsDataApi;
};
