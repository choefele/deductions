export const reviewStatuses = ['pending', 'accepted', 'rejected'] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export type SourceId = string;

export const sourceKinds = ['manual-upload'] as const;
export type SourceKind = (typeof sourceKinds)[number];
export const defaultSourceKind: SourceKind = 'manual-upload';

export const taxCategoryIds = [
  'work-related-expenses',
  'special-expenses',
  'extraordinary-burdens',
  'household-services',
  'uncategorized',
] as const;
export type TaxCategoryId = (typeof taxCategoryIds)[number];

export const currencies = ['EUR'] as const;
export type Currency = (typeof currencies)[number];

export type TaxCategory = {
  id: TaxCategoryId;
  label: string;
  description: string;
};

export const taxCategories: TaxCategory[] = [
  {
    id: 'work-related-expenses',
    label: 'Work-related expenses',
    description: 'Professional costs that may be relevant for employment income.',
  },
  {
    id: 'special-expenses',
    label: 'Special expenses',
    description: 'Private expenses that may belong in special expense categories.',
  },
  {
    id: 'extraordinary-burdens',
    label: 'Extraordinary burdens',
    description: 'Exceptional personal expenses that may need closer review.',
  },
  {
    id: 'household-services',
    label: 'Household services',
    description: 'Household-related services where invoice and payment evidence matter.',
  },
  {
    id: 'uncategorized',
    label: 'Uncategorized',
    description: 'Imported or extracted items that still need a category assignment.',
  },
];

export type DocumentSummary = {
  id: string;
  sourceId: SourceId;
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sha256: string;
  importedAt: string;
};

export const documentStatuses = [
  'imported',
  'processing',
  'needs_review',
  'processed',
] as const;
export type DocumentStatus = (typeof documentStatuses)[number];

export type DocumentListSummary = DocumentSummary & {
  sourceLabel: string;
  sourceKind: SourceKind;
  status: DocumentStatus;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processorVersion?: string;
  invoiceCount: number;
  invoiceItemCount: number;
  pendingItemCount: number;
  taxYears: number[];
  latestError?: string;
};

export type InvoiceHeader = {
  id: string;
  documentId: string | null;
  sourceId: SourceId | null;
  vendor: string;
  invoiceDate: string;
  invoiceNumber?: string;
};

export type InvoiceItemSummary = {
  id: string;
  invoiceId: string;
  documentId: string | null;
  sourceId: SourceId | null;
  vendor: string;
  invoiceDate: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  currency: Currency;
  taxYear: number;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
};

export type InvoiceItemDetail = InvoiceItemSummary & {
  deductionReason: string | null;
  note?: string;
  document: DocumentSummary | null;
};

export type InvoiceDetail = InvoiceHeader & {
  document: DocumentSummary | null;
  items: InvoiceItemDetail[];
};

export type DocumentDetail = DocumentListSummary & {
  invoices: InvoiceDetail[];
};

export type CountSummary = {
  pending: number;
  accepted: number;
  rejected: number;
};

export type CategorySummary = {
  category: TaxCategory;
  total: number;
  counts: CountSummary;
};

export type TaxYearSummary = {
  year: number;
  total: number;
  counts: CountSummary;
  categories: CategorySummary[];
};

export type AllYearsSummary = {
  years: TaxYearSummary[];
  counts: CountSummary;
  recentInvoiceItems: InvoiceItemSummary[];
};

export type SourceSummary = {
  id: SourceId;
  kind: SourceKind;
  label: string;
  documentCount: number;
  invoiceCount: number;
  invoiceItemCount: number;
};

export type DeductionsDataApi = {
  listCategories(): Promise<TaxCategory[]>;
  getAllYearsSummary(): Promise<AllYearsSummary>;
  listTaxYears(): Promise<TaxYearSummary[]>;
  getTaxYearSummary(year: number): Promise<TaxYearSummary | null>;
  listInvoiceItemsByCategory(
    year: number,
    categoryId: TaxCategoryId,
  ): Promise<InvoiceItemSummary[]>;
  listInvoiceItemsByReviewStatus(
    reviewStatus: ReviewStatus,
  ): Promise<InvoiceItemSummary[]>;
  getInvoiceItemById(invoiceItemId: string): Promise<InvoiceItemDetail | null>;
  getInvoiceById(invoiceId: string): Promise<InvoiceDetail | null>;
  listDocumentSummaries(): Promise<DocumentListSummary[]>;
  getDocumentDetail(documentId: string): Promise<DocumentDetail | null>;
  deleteDocument(documentId: string): Promise<boolean>;
  listSources(): Promise<SourceSummary[]>;
};
