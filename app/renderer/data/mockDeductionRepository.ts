import type {
  AllYearsSummary,
  CategorySummary,
  CountSummary,
  DeductionRepository,
  Invoice,
  ReviewQueueId,
  SourceId,
  TaxCategory,
  TaxCategoryId,
  TaxYearSummary,
} from './deductionRepository';

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
    id: 'tradesperson-services',
    label: 'Tradesperson services',
    description: 'Tradesperson invoices that may be relevant for household work.',
  },
  {
    id: 'not-tax-relevant',
    label: 'Not tax-relevant',
    description: 'Reviewed items that should stay out of the export.',
  },
];

const invoices: Invoice[] = [
  {
    id: 'inv-2025-001',
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    vendor: 'Apple Store',
    date: '2025-02-14',
    amount: 1299,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'pending',
    flags: ['needs-consultant-review'],
    confidence: 'medium',
    invoiceNumber: 'APL-2025-8841',
    reason: 'Laptop purchase may be work-related, but private use should be clarified.',
    note: 'Used for client presentations and home office.',
  },
  {
    id: 'inv-2025-002',
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    vendor: 'Amazon',
    date: '2025-03-03',
    amount: 189.99,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'accepted',
    flags: [],
    confidence: 'high',
    invoiceNumber: 'DE-552194',
    reason: 'Monitor arm and cables may support home office work.',
  },
  {
    id: 'inv-2025-003',
    taxYear: 2025,
    categoryId: 'special-expenses',
    vendor: 'Techniker Krankenkasse',
    date: '2025-01-31',
    amount: 540,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'pending',
    flags: [],
    confidence: 'low',
    invoiceNumber: 'TK-2025-017',
    reason: 'Insurance-related document needs review before export.',
  },
  {
    id: 'inv-2025-004',
    taxYear: 2025,
    categoryId: 'household-services',
    vendor: 'CleanHome GmbH',
    date: '2025-04-12',
    amount: 240,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'accepted',
    flags: ['export-issue'],
    confidence: 'high',
    invoiceNumber: 'CH-9012',
    reason: 'Household service invoice may require proof of non-cash payment.',
    note: 'Need bank transfer receipt before export.',
  },
  {
    id: 'inv-2025-005',
    taxYear: 2025,
    categoryId: 'tradesperson-services',
    vendor: 'Elektro Weber',
    date: '2025-05-20',
    amount: 680,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'pending',
    flags: ['needs-consultant-review'],
    confidence: 'medium',
    invoiceNumber: 'EW-1195',
    reason: 'Tradesperson work may be relevant if labor costs are separated.',
  },
  {
    id: 'inv-2025-006',
    taxYear: 2025,
    categoryId: 'not-tax-relevant',
    vendor: 'Cinema Mitte',
    date: '2025-06-02',
    amount: 32,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'rejected',
    flags: [],
    confidence: 'high',
    reason: 'Personal entertainment purchase.',
  },
  {
    id: 'inv-2024-001',
    taxYear: 2024,
    categoryId: 'work-related-expenses',
    vendor: 'JetBrains',
    date: '2024-09-01',
    amount: 239,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'accepted',
    flags: [],
    confidence: 'high',
    invoiceNumber: 'JB-2024-923',
    reason: 'Developer tooling subscription for professional work.',
  },
  {
    id: 'inv-2024-002',
    taxYear: 2024,
    categoryId: 'extraordinary-burdens',
    vendor: 'Orthopädie Zentrum',
    date: '2024-11-18',
    amount: 410,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'pending',
    flags: ['needs-consultant-review'],
    confidence: 'low',
    invoiceNumber: 'OZ-7742',
    reason: 'Medical expense may require threshold and context review.',
  },
  {
    id: 'inv-2024-003',
    taxYear: 2024,
    categoryId: 'not-tax-relevant',
    vendor: 'Bookshop Central',
    date: '2024-12-04',
    amount: 24.5,
    currency: 'EUR',
    source: 'manual-upload',
    status: 'rejected',
    flags: [],
    confidence: 'medium',
    reason: 'No tax relevance identified after review.',
  },
];

const emptyCounts = (): CountSummary => ({
  pending: 0,
  accepted: 0,
  rejected: 0,
  lowConfidence: 0,
  consultantReview: 0,
  exportIssues: 0,
});

const addInvoiceToCounts = (counts: CountSummary, invoice: Invoice) => {
  counts[invoice.status] += 1;

  if (invoice.confidence === 'low') {
    counts.lowConfidence += 1;
  }

  if (invoice.flags.includes('needs-consultant-review')) {
    counts.consultantReview += 1;
  }

  if (invoice.flags.includes('export-issue')) {
    counts.exportIssues += 1;
  }
};

export const summarizeInvoices = (items: Invoice[]): CountSummary => {
  const counts = emptyCounts();
  items.forEach((invoice) => addInvoiceToCounts(counts, invoice));
  return counts;
};

const summarizeCategory = (
  category: TaxCategory,
  categoryInvoices: Invoice[],
): CategorySummary => ({
  category,
  total: categoryInvoices.length,
  counts: summarizeInvoices(categoryInvoices),
});

const summarizeYear = (year: number): TaxYearSummary => {
  const yearInvoices = invoices.filter((invoice) => invoice.taxYear === year);
  return {
    year,
    total: yearInvoices.length,
    counts: summarizeInvoices(yearInvoices),
    categories: taxCategories.map((category) =>
      summarizeCategory(
        category,
        yearInvoices.filter((invoice) => invoice.categoryId === category.id),
      ),
    ),
  };
};

const getYears = () =>
  [...new Set(invoices.map((invoice) => invoice.taxYear))].sort((a, b) => b - a);

const matchesQueue = (invoice: Invoice, queue: ReviewQueueId) => {
  switch (queue) {
    case 'pending':
      return invoice.status === 'pending';
    case 'low-confidence':
      return invoice.confidence === 'low';
    case 'consultant-review':
      return invoice.flags.includes('needs-consultant-review');
    case 'export-issues':
      return invoice.flags.includes('export-issue');
  }
};

const listYearSummaries = () => getYears().map(summarizeYear);

export const mockDeductionRepository: DeductionRepository = {
  async listCategories() {
    return taxCategories;
  },

  async getAllYearsSummary(): Promise<AllYearsSummary> {
    return {
      years: listYearSummaries(),
      counts: summarizeInvoices(invoices),
      recentInvoices: [...invoices]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5),
    };
  },

  async listTaxYears() {
    return listYearSummaries();
  },

  async getTaxYearSummary(year: number) {
    if (!getYears().includes(year)) {
      return null;
    }

    return summarizeYear(year);
  },

  async listInvoicesByCategory(year: number, categoryId: TaxCategoryId) {
    return invoices
      .filter(
        (invoice) =>
          invoice.taxYear === year && invoice.categoryId === categoryId,
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  },

  async listReviewQueueInvoices(queue: ReviewQueueId) {
    return invoices.filter((invoice) => matchesQueue(invoice, queue));
  },

  async getInvoiceById(invoiceId: string) {
    return invoices.find((invoice) => invoice.id === invoiceId) ?? null;
  },

  async listSources() {
    const sourceLabels: Record<SourceId, string> = {
      'manual-upload': 'Manual uploads',
      'connected-source': 'Connected sources',
    };

    return (Object.keys(sourceLabels) as SourceId[]).map((id) => ({
      id,
      label: sourceLabels[id],
      count: invoices.filter((invoice) => invoice.source === id).length,
    }));
  },
};
