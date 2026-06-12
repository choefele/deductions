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
} from '../../shared/deductions';
import { taxCategories } from '../../shared/deductions';
import type { DeductionsDrizzleDatabase } from './types';

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
  constructor(private readonly db: DeductionsDrizzleDatabase) {}

  async listCategories(): Promise<TaxCategory[]> {
    return taxCategories;
  }

  async getAllYearsSummary() {
    const years = await this.listTaxYears();

    return {
      years,
      counts: this.countSummary(),
      recentInvoiceItems: this.listItemSummaries('', [], 'ii.updated_at desc', 5),
    };
  }

  async listTaxYears(): Promise<TaxYearSummary[]> {
    const rows = this.db.$client
      .prepare(
        `
          select distinct tax_year as year
          from invoice_items
          order by tax_year desc
        `,
      )
      .all() as Array<{ year: number }>;

    return rows.map((row) => this.buildTaxYearSummary(row.year));
  }

  async getTaxYearSummary(year: number) {
    const row = this.db.$client
      .prepare(
        `
          select 1 as existsFlag
          from invoice_items
          where tax_year = ?
          limit 1
        `,
      )
      .get(year) as { existsFlag: number } | undefined;

    if (!row) {
      return null;
    }

    return this.buildTaxYearSummary(year);
  }

  async listInvoiceItemsByCategory(
    year: number,
    categoryId: TaxCategoryId,
  ): Promise<InvoiceItemSummary[]> {
    return this.listItemSummaries(
      'where ii.tax_year = ? and ii.category_id = ?',
      [year, categoryId],
      'i.invoice_date desc, ii.sort_order asc',
    );
  }

  async listInvoiceItemsByReviewStatus(
    reviewStatus: ReviewStatus,
  ): Promise<InvoiceItemSummary[]> {
    return this.listItemSummaries(
      'where ii.review_status = ?',
      [reviewStatus],
      'ii.updated_at desc',
    );
  }

  async getInvoiceItemById(invoiceItemId: string) {
    const row = this.db.$client
      .prepare(
        `
          ${this.itemDetailSelectSql()}
          where ii.id = ?
          limit 1
        `,
      )
      .get(invoiceItemId) as ItemDetailRow | undefined;

    return row ? mapItemDetail(row) : null;
  }

  async getInvoiceById(invoiceId: string): Promise<InvoiceDetail | null> {
    const row = this.db.$client
      .prepare(
        `
          select
            i.id as id,
            i.document_id as documentId,
            d.source_id as sourceId,
            i.vendor as vendor,
            i.invoice_date as invoiceDate,
            i.invoice_number as invoiceNumber,
            d.id as documentSummaryId,
            d.original_file_name as originalFileName,
            d.storage_path as storagePath,
            d.mime_type as mimeType,
            d.sha256 as sha256,
            d.imported_at as importedAt
          from invoices i
          left join documents d on d.id = i.document_id
          where i.id = ?
          limit 1
        `,
      )
      .get(invoiceId) as InvoiceHeaderRow | undefined;

    if (!row) {
      return null;
    }

    const itemRows = this.db.$client
      .prepare(
        `
          ${this.itemDetailSelectSql()}
          where i.id = ?
          order by ii.sort_order asc, ii.created_at asc
        `,
      )
      .all(invoiceId) as ItemDetailRow[];

    return {
      ...mapInvoiceHeader(row),
      document: toDocumentSummary(row),
      items: itemRows.map(mapItemDetail),
    };
  }

  async listSources(): Promise<SourceSummary[]> {
    return this.db.$client
      .prepare(
        `
          select
            s.id as id,
            s.kind as kind,
            s.label as label,
            count(distinct d.id) as documentCount,
            count(distinct i.id) as invoiceCount,
            count(distinct ii.id) as invoiceItemCount
          from sources s
          left join documents d on d.source_id = s.id
          left join invoices i on i.document_id = d.id
          left join invoice_items ii on ii.invoice_id = i.id
          group by s.id, s.label
          order by s.created_at asc
        `,
      )
      .all() as SourceSummaryRow[];
  }

  private buildTaxYearSummary(year: number): TaxYearSummary {
    const categories = taxCategories.map((category) => {
      const whereSql = 'where ii.tax_year = ? and ii.category_id = ?';
      const params = [year, category.id];
      const counts = this.countSummary(whereSql, params);

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
    const counts = this.countSummary('where ii.tax_year = ?', [year]);

    return {
      year,
      total: counts.pending + counts.accepted + counts.rejected,
      counts,
      categories,
    };
  }

  private countSummary(whereSql = '', params: unknown[] = []): CountSummary {
    const counts = emptyCounts();
    const statusRows = this.db.$client
      .prepare(
        `
          select
            ii.review_status as reviewStatus,
            count(*) as count
          from invoice_items ii
          join invoices i on i.id = ii.invoice_id
          ${whereSql}
          group by ii.review_status
        `,
      )
      .all(...params) as CountRow[];

    statusRows.forEach((row) => {
      counts[row.reviewStatus] = row.count;
    });

    return counts;
  }

  private listItemSummaries(
    whereSql: string,
    params: unknown[],
    orderBySql: string,
    limit?: number,
  ): InvoiceItemSummary[] {
    const limitSql = limit ? `limit ${limit}` : '';
    const rows = this.db.$client
      .prepare(
        `
          ${this.itemSummarySelectSql()}
          ${whereSql}
          order by ${orderBySql}
          ${limitSql}
        `,
      )
      .all(...params) as ItemSummaryRow[];

    return rows.map(mapItemSummary);
  }

  private itemSummarySelectSql() {
    return `
      select
        ii.id as id,
        ii.invoice_id as invoiceId,
        i.document_id as documentId,
        d.source_id as sourceId,
        i.vendor as vendor,
        i.invoice_date as invoiceDate,
        i.invoice_number as invoiceNumber,
        ii.description as description,
        ii.amount_cents as amountCents,
        ii.currency as currency,
        ii.tax_year as taxYear,
        ii.category_id as categoryId,
        ii.review_status as reviewStatus
      from invoice_items ii
      join invoices i on i.id = ii.invoice_id
      left join documents d on d.id = i.document_id
    `;
  }

  private itemDetailSelectSql() {
    return `
      select
        ii.id as id,
        ii.invoice_id as invoiceId,
        i.document_id as documentId,
        d.source_id as sourceId,
        i.vendor as vendor,
        i.invoice_date as invoiceDate,
        i.invoice_number as invoiceNumber,
        ii.description as description,
        ii.amount_cents as amountCents,
        ii.currency as currency,
        ii.tax_year as taxYear,
        ii.category_id as categoryId,
        ii.review_status as reviewStatus,
        ii.deduction_reason as deductionReason,
        ii.note as note,
        d.id as documentSummaryId,
        d.original_file_name as originalFileName,
        d.storage_path as storagePath,
        d.mime_type as mimeType,
        d.sha256 as sha256,
        d.imported_at as importedAt
      from invoice_items ii
      join invoices i on i.id = ii.invoice_id
      left join documents d on d.id = i.document_id
    `;
  }
}
