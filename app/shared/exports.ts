export type ExportYearOption = {
  year: number;
  acceptedItemCount: number;
  inReviewItemCount: number;
  includedItemCount: number;
  includedAmount: number;
  currency: 'EUR';
  issueCount: number;
};

export type ExportInvoicesRequest = {
  years: number[];
};

export type ExportYearResult = {
  year: number;
  status: 'created' | 'skipped' | 'failed';
  filePath?: string;
  itemCount: number;
  issueCount: number;
  message?: string;
};

export type ExportInvoicesResult = {
  canceled: boolean;
  results: ExportYearResult[];
};

export type DeductionsExportsApi = {
  listExportYearOptions(): Promise<ExportYearOption[]>;
  exportInvoices(request: ExportInvoicesRequest): Promise<ExportInvoicesResult>;
};
