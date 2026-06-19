import { unlink } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';

import type {
  CountSummary,
  Currency,
  DeductionsDataApi,
  DocumentDetail,
  DocumentListSummary,
  DocumentSummary,
  DocumentStatus,
  InvoiceDetail,
  InvoiceHeader,
  InvoiceSourceDocumentSummary,
  InvoiceItemDetail,
  InvoiceItemSummary,
  ReviewStatus,
  SourceKind,
  SourceSummary,
  TaxCategory,
  TaxCategoryId,
  TaxYearSummary,
  UpdateInvoiceItemReviewRequest,
} from '../../shared/data';
import { taxCategories } from '../../shared/data';
import { normalizeUpdateInvoiceItemReviewRequest } from './reviewUpdateValidation';
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
  deductionReason: string | null;
  note: string | null;
  documentSummaryId: string | null;
  originalFileName: string | null;
  storagePath: string | null;
  mimeType: string | null;
  sha256: string | null;
  importedAt: number | null;
  sourceKind: SourceKind | null;
  sourceLabel: string | null;
  status: DocumentStatus | null;
  processingStartedAt: number | null;
  processingCompletedAt: number | null;
  processingError: string | null;
  processorVersion: string | null;
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
  sourceKind: SourceKind | null;
  sourceLabel: string | null;
  status: DocumentStatus | null;
  processingStartedAt: number | null;
  processingCompletedAt: number | null;
  processingError: string | null;
  processorVersion: string | null;
};

type SourceSummaryRow = Omit<SourceSummary, 'kind'> & {
  kind: SourceKind;
};

type DocumentRow = {
  id: string;
  sourceId: string;
  sourceKind: SourceKind;
  sourceLabel: string;
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sha256: string;
  status: DocumentStatus;
  processingStartedAt: number | null;
  processingCompletedAt: number | null;
  processingError: string | null;
  processorVersion: string | null;
  importedAt: number;
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
  sourceKind: sources.kind,
  sourceLabel: sources.label,
  status: documents.status,
  processingStartedAt: documents.processingStartedAt,
  processingCompletedAt: documents.processingCompletedAt,
  processingError: documents.processingError,
  processorVersion: documents.processorVersion,
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
  sourceKind: sources.kind,
  sourceLabel: sources.label,
  status: documents.status,
  processingStartedAt: documents.processingStartedAt,
  processingCompletedAt: documents.processingCompletedAt,
  processingError: documents.processingError,
  processorVersion: documents.processorVersion,
};

const emptyCounts = (): CountSummary => ({
  pending: 0,
  accepted: 0,
  rejected: 0,
});

const toOptional = (value: string | null) => value ?? undefined;

const toDocumentSummary = (
  row: ItemDetailRow | InvoiceHeaderRow,
): InvoiceSourceDocumentSummary | null => {
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
    sourceKind: row.sourceKind ?? undefined,
    sourceLabel: row.sourceLabel ?? undefined,
    status: row.status ?? undefined,
    processingStartedAt: row.processingStartedAt
      ? new Date(row.processingStartedAt).toISOString()
      : undefined,
    processingCompletedAt: row.processingCompletedAt
      ? new Date(row.processingCompletedAt).toISOString()
      : undefined,
    processorVersion: row.processorVersion ?? undefined,
    latestError: row.processingError ?? undefined,
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

const mapDocumentSummary = (row: DocumentRow): DocumentSummary => ({
  id: row.id,
  sourceId: row.sourceId,
  originalFileName: row.originalFileName,
  storagePath: row.storagePath,
  mimeType: row.mimeType,
  sha256: row.sha256,
  importedAt: new Date(row.importedAt).toISOString(),
});

export class SqliteDeductionsData implements DeductionsDataApi {
  constructor(
    private readonly db: DeductionsDatabase,
    private readonly profileDirectory: string,
  ) {}

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
      .leftJoin(sources, eq(sources.id, documents.sourceId))
      .where(eq(invoiceItems.id, invoiceItemId))
      .limit(1)
      .get() as ItemDetailRow | undefined;

    return row ? mapItemDetail(row) : null;
  }

  async updateInvoiceItemReview(
    request: UpdateInvoiceItemReviewRequest,
  ): Promise<InvoiceItemDetail | null> {
    const update = normalizeUpdateInvoiceItemReviewRequest(
      'deductions:data:update-invoice-item-review',
      request,
    );
    const updated = this.db.transaction((tx) => {
      const existing = tx
        .select({ invoiceId: invoiceItems.invoiceId })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
        .where(eq(invoiceItems.id, update.invoiceItemId))
        .limit(1)
        .get();

      if (!existing) {
        return false;
      }

      const now = Date.now();
      const itemUpdate: Partial<typeof invoiceItems.$inferInsert> = {
        description: update.item.description,
        amountCents: update.item.amountCents,
        taxYear: update.item.taxYear,
        categoryId: update.item.categoryId,
        reviewStatus: update.item.reviewStatus,
        note: update.item.note,
        updatedAt: now,
      };

      if (update.item.deductionReason !== undefined) {
        itemUpdate.deductionReason = update.item.deductionReason;
      }

      tx.update(invoices)
        .set({
          vendor: update.invoice.vendor,
          invoiceDate: update.invoice.invoiceDate,
          invoiceNumber: update.invoice.invoiceNumber,
          updatedAt: now,
        })
        .where(eq(invoices.id, existing.invoiceId))
        .run();

      tx.update(invoiceItems)
        .set(itemUpdate)
        .where(eq(invoiceItems.id, update.invoiceItemId))
        .run();

      return true;
    });

    return updated ? this.getInvoiceItemById(update.invoiceItemId) : null;
  }

  async getInvoiceById(invoiceId: string): Promise<InvoiceDetail | null> {
    const row = this.db
      .select(invoiceHeaderSelection)
      .from(invoices)
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .leftJoin(sources, eq(sources.id, documents.sourceId))
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
      .leftJoin(sources, eq(sources.id, documents.sourceId))
      .where(eq(invoices.id, invoiceId))
      .orderBy(asc(invoiceItems.sortOrder), asc(invoiceItems.createdAt))
      .all() as ItemDetailRow[];

    return {
      ...mapInvoiceHeader(row),
      document: toDocumentSummary(row),
      items: itemRows.map(mapItemDetail),
    };
  }

  async listDocumentSummaries(): Promise<DocumentListSummary[]> {
    const rows = this.db
      .select({
        id: documents.id,
        sourceId: documents.sourceId,
        sourceKind: sources.kind,
        sourceLabel: sources.label,
        originalFileName: documents.originalFileName,
        storagePath: documents.storagePath,
        mimeType: documents.mimeType,
        sha256: documents.sha256,
        status: documents.status,
        processingStartedAt: documents.processingStartedAt,
        processingCompletedAt: documents.processingCompletedAt,
        processingError: documents.processingError,
        processorVersion: documents.processorVersion,
        importedAt: documents.importedAt,
      })
      .from(documents)
      .innerJoin(sources, eq(sources.id, documents.sourceId))
      .orderBy(desc(documents.importedAt), desc(documents.createdAt))
      .all() as DocumentRow[];

    return rows.map((row) => this.buildDocumentSummary(row));
  }

  async getDocumentDetail(documentId: string): Promise<DocumentDetail | null> {
    const row = this.db
      .select({
        id: documents.id,
        sourceId: documents.sourceId,
        sourceKind: sources.kind,
        sourceLabel: sources.label,
        originalFileName: documents.originalFileName,
        storagePath: documents.storagePath,
        mimeType: documents.mimeType,
        sha256: documents.sha256,
        status: documents.status,
        processingStartedAt: documents.processingStartedAt,
        processingCompletedAt: documents.processingCompletedAt,
        processingError: documents.processingError,
        processorVersion: documents.processorVersion,
        importedAt: documents.importedAt,
      })
      .from(documents)
      .innerJoin(sources, eq(sources.id, documents.sourceId))
      .where(eq(documents.id, documentId))
      .limit(1)
      .get() as DocumentRow | undefined;

    if (!row) {
      return null;
    }

    const invoiceRows = this.db
      .select(invoiceHeaderSelection)
      .from(invoices)
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .leftJoin(sources, eq(sources.id, documents.sourceId))
      .where(eq(invoices.documentId, documentId))
      .orderBy(desc(invoices.invoiceDate), asc(invoices.createdAt))
      .all() as InvoiceHeaderRow[];

    return {
      ...this.buildDocumentSummary(row),
      invoices: invoiceRows.map((invoiceRow) =>
        this.buildInvoiceDetail(invoiceRow),
      ),
    };
  }

  async deleteDocument(documentId: string): Promise<boolean> {
    const row = this.db
      .select({ id: documents.id, storagePath: documents.storagePath })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1)
      .get();

    if (!row) {
      return false;
    }

    const invoiceRows = this.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.documentId, documentId))
      .all();
    const invoiceIds = invoiceRows.map((invoice) => invoice.id);

    this.db.transaction((tx) => {
      if (invoiceIds.length > 0) {
        tx.delete(invoiceItems)
          .where(inArray(invoiceItems.invoiceId, invoiceIds))
          .run();
        tx.delete(invoices).where(inArray(invoices.id, invoiceIds)).run();
      }

      tx.delete(documents).where(eq(documents.id, documentId)).run();
    });

    const storedPath = this.resolveStoredDocumentPath(row.storagePath);

    if (storedPath) {
      await unlink(storedPath).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') {
          throw error;
        }
      });
    }

    return true;
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

  private buildDocumentSummary(row: DocumentRow): DocumentListSummary {
    const invoiceCount = this.scalarCount(
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(eq(invoices.documentId, row.id))
        .get(),
    );
    const invoiceItemCount = this.scalarCount(
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
        .where(eq(invoices.documentId, row.id))
        .get(),
    );
    const pendingItemCount = this.scalarCount(
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
        .where(
          and(
            eq(invoices.documentId, row.id),
            eq(invoiceItems.reviewStatus, 'pending'),
          ),
        )
        .get(),
    );
    const taxYears = this.db
      .select({ taxYear: invoiceItems.taxYear })
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(eq(invoices.documentId, row.id))
      .groupBy(invoiceItems.taxYear)
      .orderBy(desc(invoiceItems.taxYear))
      .all()
      .map((taxYearRow) => taxYearRow.taxYear);

    return {
      ...mapDocumentSummary(row),
      sourceLabel: row.sourceLabel,
      sourceKind: row.sourceKind,
      status: row.status,
      processingStartedAt: row.processingStartedAt
        ? new Date(row.processingStartedAt).toISOString()
        : undefined,
      processingCompletedAt: row.processingCompletedAt
        ? new Date(row.processingCompletedAt).toISOString()
        : undefined,
      processorVersion: row.processorVersion ?? undefined,
      latestError: row.processingError ?? undefined,
      invoiceCount,
      invoiceItemCount,
      pendingItemCount,
      taxYears,
    };
  }

  private buildInvoiceDetail(row: InvoiceHeaderRow): InvoiceDetail {
    const itemRows = this.db
      .select(itemDetailSelection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .leftJoin(sources, eq(sources.id, documents.sourceId))
      .where(eq(invoices.id, row.id))
      .orderBy(asc(invoiceItems.sortOrder), asc(invoiceItems.createdAt))
      .all() as ItemDetailRow[];

    return {
      ...mapInvoiceHeader(row),
      document: toDocumentSummary(row),
      items: itemRows.map(mapItemDetail),
    };
  }

  private scalarCount(row: { count: number } | undefined) {
    return Number(row?.count ?? 0);
  }

  private resolveStoredDocumentPath(storagePath: string): string | null {
    const profileRoot = resolve(this.profileDirectory);
    const absolutePath = resolve(profileRoot, ...storagePath.split('/'));
    const relativePath = relative(profileRoot, absolutePath);

    if (
      relativePath.length === 0 ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      return null;
    }

    return absolutePath;
  }
}
