import type {
  CountSummary,
  DeductionsDataApi,
  DocumentSummary,
  InvoiceItemDetail,
  InvoiceItemSummary,
  ReviewStatus,
  TaxCategory,
  TaxCategoryId,
  TaxYearSummary,
} from '../../shared/data';
import { taxCategories } from '../../shared/data';

const manualSourceId = 'mock-manual-upload-source';

const documents: DocumentSummary[] = [
  {
    id: 'doc-2025-apple',
    sourceId: manualSourceId,
    originalFileName: 'apple-store.pdf',
    storagePath: 'documents/2025/apple-store.pdf',
    mimeType: 'application/pdf',
    sha256: 'mock-apple-store',
    importedAt: '2026-01-15T12:00:00.000Z',
  },
  {
    id: 'doc-2025-amazon',
    sourceId: manualSourceId,
    originalFileName: 'amazon.pdf',
    storagePath: 'documents/2025/amazon.pdf',
    mimeType: 'application/pdf',
    sha256: 'mock-amazon',
    importedAt: '2026-01-15T12:01:00.000Z',
  },
  {
    id: 'doc-2024-jetbrains',
    sourceId: manualSourceId,
    originalFileName: 'jetbrains.pdf',
    storagePath: 'documents/2024/jetbrains.pdf',
    mimeType: 'application/pdf',
    sha256: 'mock-jetbrains',
    importedAt: '2026-01-15T12:02:00.000Z',
  },
];

const invoiceItems: InvoiceItemDetail[] = [
  {
    id: 'item-2025-apple',
    invoiceId: 'inv-2025-apple',
    documentId: 'doc-2025-apple',
    sourceId: manualSourceId,
    vendor: 'Apple Store',
    invoiceDate: '2025-02-14',
    invoiceNumber: 'APL-2025-8841',
    description: 'Laptop',
    amount: 1299,
    currency: 'EUR',
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    reviewStatus: 'pending',
    deductionReason:
      'Laptop purchase may be work-related, but private use should be clarified.',
    note: 'Used for client presentations and home office.',
    document: documents[0],
  },
  {
    id: 'item-2025-amazon',
    invoiceId: 'inv-2025-amazon',
    documentId: 'doc-2025-amazon',
    sourceId: manualSourceId,
    vendor: 'Amazon',
    invoiceDate: '2025-03-03',
    invoiceNumber: 'DE-552194',
    description: 'Monitor arm and cables',
    amount: 189.99,
    currency: 'EUR',
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    reviewStatus: 'accepted',
    deductionReason: 'Monitor arm and cables may support home office work.',
    document: documents[1],
  },
  {
    id: 'item-2024-jetbrains',
    invoiceId: 'inv-2024-jetbrains',
    documentId: 'doc-2024-jetbrains',
    sourceId: manualSourceId,
    vendor: 'JetBrains',
    invoiceDate: '2024-09-01',
    invoiceNumber: 'JB-2024-923',
    description: 'Developer tooling subscription',
    amount: 239,
    currency: 'EUR',
    taxYear: 2024,
    categoryId: 'work-related-expenses',
    reviewStatus: 'accepted',
    deductionReason: 'Developer tooling subscription for professional work.',
    document: documents[2],
  },
];

const emptyCounts = (): CountSummary => ({
  pending: 0,
  accepted: 0,
  rejected: 0,
});

const summarizeItems = (items: InvoiceItemSummary[]) =>
  items.reduce((counts, item) => {
    counts[item.reviewStatus] += 1;
    return counts;
  }, emptyCounts());

const itemTotal = (counts: CountSummary) =>
  counts.pending + counts.accepted + counts.rejected;

const summarizeCategory = (
  category: TaxCategory,
  categoryItems: InvoiceItemSummary[],
) => {
  const counts = summarizeItems(categoryItems);

  return {
    category,
    total: itemTotal(counts),
    counts,
  };
};

const years = () =>
  [...new Set(invoiceItems.map((item) => item.taxYear))].sort((a, b) => b - a);

const summarizeYear = (year: number): TaxYearSummary => {
  const yearItems = invoiceItems.filter((item) => item.taxYear === year);
  const counts = summarizeItems(yearItems);

  return {
    year,
    total: itemTotal(counts),
    counts,
    categories: taxCategories.map((category) =>
      summarizeCategory(
        category,
        yearItems.filter((item) => item.categoryId === category.id),
      ),
    ),
  };
};

const toSummary = (item: InvoiceItemDetail): InvoiceItemSummary => ({
  id: item.id,
  invoiceId: item.invoiceId,
  documentId: item.documentId,
  sourceId: item.sourceId,
  vendor: item.vendor,
  invoiceDate: item.invoiceDate,
  invoiceNumber: item.invoiceNumber,
  description: item.description,
  amount: item.amount,
  currency: item.currency,
  taxYear: item.taxYear,
  categoryId: item.categoryId,
  reviewStatus: item.reviewStatus,
});

export const mockDeductionRepository: DeductionsDataApi = {
  async listCategories() {
    return taxCategories;
  },

  async getAllYearsSummary() {
    return {
      years: years().map(summarizeYear),
      counts: summarizeItems(invoiceItems),
      recentInvoiceItems: [...invoiceItems]
        .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
        .slice(0, 5)
        .map(toSummary),
    };
  },

  async listTaxYears() {
    return years().map(summarizeYear);
  },

  async getTaxYearSummary(year: number) {
    return years().includes(year) ? summarizeYear(year) : null;
  },

  async listInvoiceItemsByCategory(year: number, categoryId: TaxCategoryId) {
    return invoiceItems
      .filter((item) => item.taxYear === year && item.categoryId === categoryId)
      .sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate))
      .map(toSummary);
  },

  async listInvoiceItemsByReviewStatus(reviewStatus: ReviewStatus) {
    return invoiceItems
      .filter((item) => item.reviewStatus === reviewStatus)
      .map(toSummary);
  },

  async getInvoiceItemById(invoiceItemId: string) {
    return invoiceItems.find((item) => item.id === invoiceItemId) ?? null;
  },

  async getInvoiceById(invoiceId: string) {
    const items = invoiceItems.filter((item) => item.invoiceId === invoiceId);
    const first = items[0];

    if (!first) {
      return null;
    }

    return {
      id: first.invoiceId,
      documentId: first.documentId,
      sourceId: first.sourceId,
      vendor: first.vendor,
      invoiceDate: first.invoiceDate,
      invoiceNumber: first.invoiceNumber,
      document: first.document,
      items,
    };
  },

  async listSources() {
    return [
      {
        id: manualSourceId,
        kind: 'manual-upload',
        label: 'Manual upload',
        documentCount: documents.length,
        invoiceCount: new Set(invoiceItems.map((item) => item.invoiceId)).size,
        invoiceItemCount: invoiceItems.length,
      },
    ];
  },
};
