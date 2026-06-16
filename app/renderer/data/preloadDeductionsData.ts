import type { DeductionsDataApi } from '../../shared/data';

export const preloadDeductionsData: DeductionsDataApi = {
  listCategories: () => window.deductions.data.listCategories(),
  getAllYearsSummary: () => window.deductions.data.getAllYearsSummary(),
  listTaxYears: () => window.deductions.data.listTaxYears(),
  getTaxYearSummary: (year) =>
    window.deductions.data.getTaxYearSummary(year),
  listInvoiceItemsByCategory: (year, categoryId) =>
    window.deductions.data.listInvoiceItemsByCategory(year, categoryId),
  listInvoiceItemsByReviewStatus: (reviewStatus) =>
    window.deductions.data.listInvoiceItemsByReviewStatus(reviewStatus),
  getInvoiceItemById: (invoiceItemId) =>
    window.deductions.data.getInvoiceItemById(invoiceItemId),
  getInvoiceById: (invoiceId) =>
    window.deductions.data.getInvoiceById(invoiceId),
  listDocumentSummaries: () => window.deductions.data.listDocumentSummaries(),
  getDocumentDetail: (documentId) =>
    window.deductions.data.getDocumentDetail(documentId),
  listSources: () => window.deductions.data.listSources(),
};
