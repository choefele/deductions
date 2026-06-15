import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm';

import type {
  CountSummary,
  Currency,
  DeductionsDataApi,
  DocumentSummary,
  InvoiceDetail,
  InvoiceHeader,
  InvoiceItemDetail,
  InvoiceItemSummary,
  ReviewStatus,
  SourceKind,
  SourceSummary,
  TaxCategory,
  TaxCategoryId,
  TaxYearSummary,
} from '../../shared/data';
import { taxCategories } from '../../shared/data';
import { documents, invoiceItems, invoices, sources } from './schema';
import type { DeductionsDatabase } from './types';

type CountRow = {
  reviewStatus: ReviewStatus;
  count: number;
};

type ItemSummaryRow = {
  id: string;
  invoiceId: string;
  documentId: string | null;
  sourceId: string | null;
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string | null;
  description: string;
  amountCents: number;
  currency: Currency;
  taxYear: number;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
};

type ItemDetailRow = ItemSummaryRow & {
  deductionReason: string;
  note: string | null;
  documentSummaryId: string | null;
  originalFileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sha256: string | null;
  importedAt: number | null;
};

type InvoiceHeaderRow = {
  id: string;
  documentId: string | null;
  sourceId: string | null;
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string | null;
  documentSummaryId: string | null;
  originalFileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sha256: string | null;
  importedAt: number | null;
};

type SourceSummaryRow = Omit<SourceSummary, 'kind'> & {
  kind: SourceKind;
};

const itemSummarySelection = {
  id: invoiceItems.id,
  invoiceId: invoiceItems.invoiceId,
  documentId: invoices.documentId,
  sourceId: documents.sourceId,
  vendor: invoices.vendor,
  invoiceDate: invoices.invoiceDate,
  invoiceNumber: invoices.invoiceNumber,
  description: invoiceItems.description,
  amountCents: invoiceItems.amountCents,
  currency: invoiceItems.currency,
  taxYear: invoiceItems.taxYear,
  categoryId: invoiceItems.categoryId,
  reviewStatus: invoiceItems.reviewStatus,
};

const itemDetailSelection = {
  ...itemSummarySelection,
  deductionReason: invoiceItems.deductionReason,
  note: invoiceItems.note,
  documentSummaryId: documents.id,
  originalFileName: documents.originalFileName,
  storagePath: documents.storagePath,
  mimeType: documents.mimeType,
  sha256: documents.sha256,
  importedAt: documents.importedAt,
};

const invoiceHeaderSelection = {
  id: invoices.id,
  documentId: invoices.documentId,
  sourceId: documents.sourceId,
  vendor: invoices.vendor,
  invoiceDate: invoices.invoiceDate,
  invoiceNumber: invoices.invoiceNumber,
  documentSummaryId: documents.id,
  originalFileName: documents.originalFileName,
  storagePath: documents.storagePath,
  mimeType: documents.mimeType,
  sha256: documents.sha256,
  importedAt: documents.importedAt,
};

const emptyCounts = (): CountSummary => ({
  pending: 0,
  accepted: 0,
  rejected: 0,
});

const toOptional = (value: string | null) => value ?? undefined;

const toDocumentSummary = (
  row: ItemDetailRow | InvoiceHeaderRow,
): DocumentSummary | null => {
  if (!row.documentSummaryId) {
    return null;
  }

  return {
    id: row.documentSummaryId,
    sourceId: row.sourceId ?? '',
    originalFileName: row.originalFileName ?? '',
    storagePath: row.storagePath ?? '',
    mimeType: row.mimeType ?? '',
    sha256: row.sha256 ?? '',
    importedAt: new Date(row.importedAt ?? 0).toISOString(),
  };
};

const mapItemSummary = (row: ItemSummaryRow): InvoiceItemSummary => ({
  id: row.id,
  invoiceId: row.invoiceId,
  documentId: row.documentId,
  sourceId: row.sourceId,
  vendor: row.vendor,
  invoiceDate: row.invoiceDate,
  invoiceNumber: toOptional(row.invoiceNumber),
  description: row.description,
  amount: row.amountCents / 100,
  currency: row.currency,
  taxYear: row.taxYear,
  categoryId: row.categoryId,
  reviewStatus: row.reviewStatus,
});

const mapItemDetail = (row: ItemDetailRow): InvoiceItemDetail => ({
  ...mapItemSummary(row),
  deductionReason: row.deductionReason,
  note: toOptional(row.note),
  document: toDocumentSummary(row),
});

const mapInvoiceHeader = (row: InvoiceHeaderRow): InvoiceHeader => ({
  id: row.id,
  documentId: row.documentId,
  sourceId: row.sourceId,
  vendor: row.vendor,
  invoiceDate: row.invoiceDate,
  invoiceNumber: toOptional(row.invoiceNumber),
});

export class SqliteDeductionsData implements DeductionsDataApi {
  constructor(private readonly db: DeductionsDatabase) {}

  async listCategories(): Promise<TaxCategory[]> {
    return taxCategories;
  }

  async getAllYearsSummary() {
    const years = await this.listTaxYears();

    return {
      years,
      counts: this.countSummary(),
      recentInvoiceItems: this.listRecentItemSummaries(),
    };
  }

  async listTaxYears(): Promise<TaxYearSummary[]> {
    const rows = this.db
      .select({ year: invoiceItems.taxYear })
      .from(invoiceItems)
      .groupBy(invoiceItems.taxYear)
      .orderBy(desc(invoiceItems.taxYear))
      .all();

    return rows.map((row) => this.buildTaxYearSummary(row.year));
  }

  async getTaxYearSummary(year: number) {
    const row = this.db
      .select({ existsFlag: sql<number>`1` })
      .from(invoiceItems)
      .where(eq(invoiceItems.taxYear, year))
      .limit(1)
      .get();

    if (!row) {
      return null;
    }

    return this.buildTaxYearSummary(year);
  }

  async listInvoiceItemsByCategory(
    year: number,
    categoryId: TaxCategoryId,
  ): Promise<InvoiceItemSummary[]> {
    const rows = this.db
      .select(itemSummarySelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(
        and(
          eq(invoiceItems.taxYear, year),
          eq(invoiceItems.categoryId, categoryId),
        ),
      )
      .orderBy(desc(invoices.invoiceDate), asc(invoiceItems.sortOrder))
      .all() as ItemSummaryRow[];

    return rows.map(mapItemSummary);
  }

  async listInvoiceItemsByReviewStatus(
    reviewStatus: ReviewStatus,
  ): Promise<InvoiceItemSummary[]> {
    const rows = this.db
      .select(itemSummarySelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(eq(invoiceItems.reviewStatus, reviewStatus))
      .orderBy(desc(invoiceItems.updatedAt))
      .all() as ItemSummaryRow[];

    return rows.map(mapItemSummary);
  }

  async getInvoiceItemById(invoiceItemId: string) {
    const row = this.db
      .select(itemDetailSelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(eq(invoiceItems.id, invoiceItemId))
      .limit(1)
      .get() as ItemDetailRow | undefined;

    return row ? mapItemDetail(row) : null;
  }

  async getInvoiceById(invoiceId: string): Promise<InvoiceDetail | null> {
    const row = this.db
      .select(invoiceHeaderSelection)
      .from(invoices)
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(eq(invoices.id, invoiceId))
      .limit(1)
      .get() as InvoiceHeaderRow | undefined;

    if (!row) {
      return null;
    }

    const itemRows = this.db
      .select(itemDetailSelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(eq(invoices.id, invoiceId))
      .orderBy(asc(invoiceItems.sortOrder), asc(invoiceItems.createdAt))
      .all() as ItemDetailRow[];

    return {
      ...mapInvoiceHeader(row),
      document: toDocumentSummary(row),
      items: itemRows.map(mapItemDetail),
    };
  }

  async listSources(): Promise<SourceSummary[]> {
    return this.db
      .select({
        id: sources.id,
        kind: sources.kind,
        label: sources.label,
        documentCount: sql<number>`count(distinct ${documents.id})`,
        invoiceCount: sql<number>`count(distinct ${invoices.id})`,
        invoiceItemCount: sql<number>`count(distinct ${invoiceItems.id})`,
      })
      .from(sources)
      .leftJoin(documents, eq(documents.sourceId, sources.id))
      .leftJoin(invoices, eq(invoices.documentId, documents.id))
      .leftJoin(invoiceItems, eq(invoiceItems.invoiceId, invoices.id))
      .groupBy(sources.id, sources.label)
      .orderBy(asc(sources.createdAt))
      .all() as SourceSummaryRow[];
  }

  private buildTaxYearSummary(year: number): TaxYearSummary {
    const categories = taxCategories.map((category) => {
      const counts = this.countSummary(
        and(
          eq(invoiceItems.taxYear, year),
          eq(invoiceItems.categoryId, category.id),
        ),
      );

      return {
        category: {
          id: category.id,
          label: category.label,
          description: category.description,
        },
        total: counts.pending + counts.accepted + counts.rejected,
        counts,
      };
    });
    const counts = this.countSummary(eq(invoiceItems.taxYear, year));

    return {
      year,
      total: counts.pending + counts.accepted + counts.rejected,
      counts,
      categories,
    };
  }

  private countSummary(where?: SQL): CountSummary {
    const counts = emptyCounts();
    const statusRows = this.db
      .select({
        reviewStatus: invoiceItems.reviewStatus,
        count: sql<number>`count(*)`,
      })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(where)
      .groupBy(invoiceItems.reviewStatus)
      .all() as CountRow[];

    statusRows.forEach((row) => {
      counts[row.reviewStatus] = row.count;
    });

    return counts;
  }

  private listRecentItemSummaries(): InvoiceItemSummary[] {
    const rows = this.db
      .select(itemSummarySelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .orderBy(desc(invoiceItems.updatedAt))
      .limit(5)
      .all() as ItemSummaryRow[];

    return rows.map(mapItemSummary);
  }
}
