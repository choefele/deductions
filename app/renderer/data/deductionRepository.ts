export type ReviewStatus = 'pending' | 'accepted' | 'rejected';

export type ReviewFlag = 'needs-consultant-review' | 'export-issue';

export type Confidence = 'high' | 'medium' | 'low';

export type SourceId = 'manual-upload' | 'connected-source';

export type TaxCategoryId =
  | 'work-related-expenses'
  | 'special-expenses'
  | 'extraordinary-burdens'
  | 'household-services'
  | 'tradesperson-services'
  | 'not-tax-relevant';

export type ReviewQueueId =
  | 'pending'
  | 'low-confidence'
  | 'consultant-review'
  | 'export-issues';

export type TaxCategory = {
  id: TaxCategoryId;
  label: string;
  description: string;
};

export type Invoice = {
  id: string;
  taxYear: number;
  categoryId: TaxCategoryId;
  vendor: string;
  date: string;
  amount: number;
  currency: 'EUR';
  source: SourceId;
  status: ReviewStatus;
  flags: ReviewFlag[];
  confidence: Confidence;
  invoiceNumber?: string;
  reason: string;
  note?: string;
};

export type CountSummary = {
  pending: number;
  accepted: number;
  rejected: number;
  lowConfidence: number;
  consultantReview: number;
  exportIssues: number;
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
  recentInvoices: Invoice[];
};

export type ImportResult = {
  fileNames: string[];
};

export type DeductionRepository = {
  listCategories(): Promise<TaxCategory[]>;
  getAllYearsSummary(): Promise<AllYearsSummary>;
  listTaxYears(): Promise<TaxYearSummary[]>;
  getTaxYearSummary(year: number): Promise<TaxYearSummary | null>;
  listInvoicesByCategory(
    year: number,
    categoryId: TaxCategoryId,
  ): Promise<Invoice[]>;
  listReviewQueueInvoices(queue: ReviewQueueId): Promise<Invoice[]>;
  getInvoiceById(invoiceId: string): Promise<Invoice | null>;
  listSources(): Promise<Array<{ id: SourceId; label: string; count: number }>>;
};
