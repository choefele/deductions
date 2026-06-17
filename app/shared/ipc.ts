import type { DeductionsDataApi } from './data';
import type { DeductionsExportsApi } from './exports';
import type { DeductionsImportsApi } from './imports';
import type { DeductionsProcessingApi } from './processing';

export const ipcChannels = {
  imports: {
    importFiles: 'deductions:imports:import-files',
    importFilePaths: 'deductions:imports:import-file-paths',
    importCompleted: 'deductions:imports:import-completed',
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
    listDocumentSummaries: 'deductions:data:list-document-summaries',
    getDocumentDetail: 'deductions:data:get-document-detail',
    deleteDocument: 'deductions:data:delete-document',
    listSources: 'deductions:data:list-sources',
  },
  processing: {
    processDocument: 'deductions:processing:process-document',
    documentsChanged: 'deductions:processing:documents-changed',
  },
  exports: {
    listYearOptions: 'deductions:exports:list-year-options',
    exportInvoices: 'deductions:exports:export-invoices',
  },
} as const;

export type DeductionsBridgeApi = {
  appInfo: {
    platform: NodeJS.Platform;
    version: string;
  };
  imports: DeductionsImportsApi;
  data: DeductionsDataApi;
  processing: DeductionsProcessingApi;
  exports: DeductionsExportsApi;
};
