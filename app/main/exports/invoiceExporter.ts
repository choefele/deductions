import { createWriteStream } from 'node:fs';
import { access, lstat, unlink } from 'node:fs/promises';
import {
  basename,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from 'node:path';

import { ZipArchive } from 'archiver';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { Workbook } from 'exceljs';

import type {
  ExportInvoicesRequest,
  ExportInvoicesResult,
  ExportYearOption,
  ExportYearResult,
} from '../../shared/exports';
import type { Currency, ReviewStatus, TaxCategoryId } from '../../shared/data';
import { taxCategories } from '../../shared/data';
import { documents, invoiceItems, invoices } from '../data/schema';
import type { DeductionsDatabase } from '../data/types';

const exportableStatuses: ReviewStatus[] = ['accepted', 'pending'];
const packageNameForYear = (year: number) => `Deductions-export-${year}`;

type ExportRow = {
  itemId: string;
  invoiceId: string;
  documentId: string | null;
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string | null;
  description: string;
  amountCents: number;
  currency: Currency;
  taxYear: number;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
  deductionReason: string | null;
  note: string | null;
  sortOrder: number;
  createdAt: number;
  originalFileName: string | null;
  storagePath: string | null;
};

type ProofDocument = {
  documentId: string;
  sourcePath: string;
  zipPath: string;
};

type ExportIssue = {
  itemId: string;
  message: string;
};

type ExportSummary = {
  year: number;
  createdAt: string;
  includedItemCount: number;
  includedAmount: number;
  inReviewItemCount: number;
  inReviewAmount: number;
};

export type ExportTarget =
  | { kind: 'single-file'; filePath: string }
  | { kind: 'directory'; directoryPath: string };

const categoryLabels = new Map(
  taxCategories.map((category) => [category.id, category.label]),
);

const selection = {
  itemId: invoiceItems.id,
  invoiceId: invoiceItems.invoiceId,
  documentId: invoices.documentId,
  vendor: invoices.vendor,
  invoiceDate: invoices.invoiceDate,
  invoiceNumber: invoices.invoiceNumber,
  description: invoiceItems.description,
  amountCents: invoiceItems.amountCents,
  currency: invoiceItems.currency,
  taxYear: invoiceItems.taxYear,
  categoryId: invoiceItems.categoryId,
  reviewStatus: invoiceItems.reviewStatus,
  deductionReason: invoiceItems.deductionReason,
  note: invoiceItems.note,
  sortOrder: invoiceItems.sortOrder,
  createdAt: invoiceItems.createdAt,
  originalFileName: documents.originalFileName,
  storagePath: documents.storagePath,
};

export const sanitizeFileNamePart = (value: string, maxLength: number) => {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return (slug || 'file').slice(0, maxLength).replace(/-+$/g, '') || 'file';
};

const extensionForRow = (row: ExportRow) => {
  const candidate =
    extname(row.originalFileName ?? '') || extname(row.storagePath ?? '');
  const sanitized = candidate.toLowerCase().replace(/[^.a-z0-9]/g, '');

  return sanitized && sanitized.length <= 10 ? sanitized : '.pdf';
};

const baseProofFileNameForRow = (row: ExportRow) => {
  const date = row.invoiceDate || String(row.taxYear);
  const vendor = sanitizeFileNamePart(row.vendor, 20);
  const hintSource =
    row.description || row.invoiceNumber || basename(row.originalFileName ?? '');
  const hint = sanitizeFileNamePart(hintSource, 28);
  const extension = extensionForRow(row);
  const maxBaseLength = 80 - extension.length;
  const base = `${date}-${vendor}-${hint}`.slice(0, maxBaseLength);

  return `${base.replace(/-+$/g, '')}${extension}`;
};

export const buildProofFileNames = (rows: ExportRow[]) => {
  const documentPaths = new Map<string, string>();
  const usedNames = new Set<string>();

  rows.forEach((row) => {
    if (!row.documentId || documentPaths.has(row.documentId)) {
      return;
    }

    const baseName = baseProofFileNameForRow(row);
    const extension = extname(baseName);
    const nameWithoutExtension = baseName.slice(0, -extension.length);
    let candidate = baseName;
    let suffix = 2;

    while (usedNames.has(candidate)) {
      const suffixText = `-${String(suffix).padStart(2, '0')}`;
      const truncatedBase = nameWithoutExtension.slice(
        0,
        80 - extension.length - suffixText.length,
      );
      candidate = `${truncatedBase.replace(/-+$/g, '')}${suffixText}${extension}`;
      suffix += 1;
    }

    usedNames.add(candidate);
    documentPaths.set(row.documentId, `documents/${candidate}`);
  });

  return documentPaths;
};

const reviewStatusLabel = (status: ReviewStatus) =>
  status === 'accepted' ? 'Accepted' : 'In review';

const excelDate = (date: string) => new Date(`${date}T00:00:00.000Z`);

const resolveStoredDocumentPath = (
  profileDirectory: string,
  storagePath: string,
) => {
  const profileRoot = resolve(profileDirectory);
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
};

const canRead = async (filePath: string) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const pathExists = async (filePath: string) => {
  try {
    await lstat(filePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    return true;
  }
};

const buildExportSummary = (
  year: number,
  rows: ExportRow[],
  createdAt = new Date(),
): ExportSummary => {
  const inReviewRows = rows.filter((row) => row.reviewStatus === 'pending');

  return {
    year,
    createdAt: createdAt.toISOString(),
    includedItemCount: rows.length,
    includedAmount:
      rows.reduce((sum, row) => sum + row.amountCents, 0) / 100,
    inReviewItemCount: inReviewRows.length,
    inReviewAmount:
      inReviewRows.reduce((sum, row) => sum + row.amountCents, 0) / 100,
  };
};

const buildWorkbook = async (
  rows: ExportRow[],
  proofPaths: Map<string, string>,
  summary: ExportSummary,
) => {
  const workbook = new Workbook();
  workbook.creator = 'Deductions';
  workbook.created = new Date(summary.createdAt);
  const overviewSheet = workbook.addWorksheet('Overview');
  const sheet = workbook.addWorksheet('Invoices');

  overviewSheet.columns = [
    { key: 'label', width: 24 },
    { key: 'value', width: 58 },
    { key: 'itemCount', width: 14 },
    { key: 'amount', width: 14 },
    { key: 'currency', width: 10 },
  ];
  overviewSheet.mergeCells('A1:E1');
  overviewSheet.getCell('A1').value = `Deductions export ${summary.year}`;
  overviewSheet.getCell('A1').font = { bold: true, size: 16 };
  overviewSheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFEFF6FF' },
  };
  overviewSheet.getCell('A1').alignment = { vertical: 'middle' };
  overviewSheet.getRow(1).height = 24;

  overviewSheet.addRows([
    ['Created at', summary.createdAt],
    ['Tax year', summary.year],
    [
      'Included statuses',
      'Accepted and in-review invoice items are included.',
    ],
    [],
    ['Summary', undefined, 'Item count', 'Amount', 'Currency'],
    [
      'Included items',
      undefined,
      summary.includedItemCount,
      summary.includedAmount,
      'EUR',
    ],
    [
      'In review items',
      undefined,
      summary.inReviewItemCount,
      summary.inReviewAmount,
      'EUR',
    ],
    [],
    ['Notes'],
    [
      'Review',
      'Rows marked "In review" still need confirmation before filing.',
    ],
    [
      'Proof files',
      'Document file names correspond to the "Proof file" column in the Invoices sheet.',
    ],
  ]);

  overviewSheet.getColumn(4).numFmt = '#,##0.00';
  [2, 3, 4, 10, 11, 12].forEach((rowNumber) => {
    overviewSheet.getRow(rowNumber).getCell(1).font = { bold: true };
  });
  overviewSheet.getRow(6).eachCell((cell) => {
    cell.font = { bold: true };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
  });
  overviewSheet.getRow(8).eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF3CD' },
    };
  });
  overviewSheet.getRow(10).font = { bold: true };
  overviewSheet.getRow(10).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  overviewSheet.eachRow((row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = { vertical: 'top', wrapText: true };
    });
  });

  sheet.columns = [
    { header: 'Tax year', key: 'taxYear', width: 10 },
    { header: 'Review status', key: 'reviewStatus', width: 16 },
    { header: 'Category', key: 'category', width: 28 },
    { header: 'Vendor', key: 'vendor', width: 24 },
    { header: 'Invoice date', key: 'invoiceDate', width: 14 },
    { header: 'Invoice number', key: 'invoiceNumber', width: 18 },
    { header: 'Description', key: 'description', width: 32 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Deduction reason', key: 'deductionReason', width: 40 },
    { header: 'Note', key: 'note', width: 32 },
    { header: 'Proof file', key: 'proofFile', width: 48 },
    { header: 'Invoice item ID', key: 'invoiceItemId', width: 38 },
    { header: 'Document ID', key: 'documentId', width: 38 },
  ];

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  rows.forEach((row) => {
    const proofPath = row.documentId ? proofPaths.get(row.documentId) ?? '' : '';
    const worksheetRow = sheet.addRow({
      taxYear: row.taxYear,
      reviewStatus: reviewStatusLabel(row.reviewStatus),
      category: categoryLabels.get(row.categoryId) ?? row.categoryId,
      vendor: row.vendor,
      invoiceDate: excelDate(row.invoiceDate),
      invoiceNumber: row.invoiceNumber ?? '',
      description: row.description,
      amount: row.amountCents / 100,
      currency: row.currency,
      deductionReason: row.deductionReason ?? '',
      note: row.note ?? '',
      proofFile: proofPath,
      invoiceItemId: row.itemId,
      documentId: row.documentId ?? '',
    });

    if (row.reviewStatus === 'pending') {
      worksheetRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF3CD' },
        };
      });
    }
  });

  sheet.getRow(1).font = { bold: true };
  sheet.getColumn('invoiceDate').numFmt = 'yyyy-mm-dd';
  sheet.getColumn('amount').numFmt = '#,##0.00';
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: sheet.columns.length },
  };

  return workbook.xlsx.writeBuffer();
};

const writeZipPackage = async ({
  year,
  filePath,
  rows,
  proofDocuments,
}: {
  year: number;
  filePath: string;
  rows: ExportRow[];
  proofDocuments: ProofDocument[];
}) => {
  const packageName = packageNameForYear(year);
  const summary = buildExportSummary(year, rows);
  const workbookBuffer = await buildWorkbook(
    rows,
    new Map(proofDocuments.map((proof) => [proof.documentId, proof.zipPath])),
    summary,
  );
  const output = createWriteStream(filePath);
  const archive = new ZipArchive({ zlib: { level: 9 } });

  await new Promise<void>((resolvePromise, rejectPromise) => {
    output.on('close', resolvePromise);
    output.on('error', rejectPromise);
    archive.on('error', rejectPromise);
    archive.pipe(output);
    archive.append(Buffer.from(workbookBuffer), {
      name: `${packageName}/invoices-${year}.xlsx`,
    });
    proofDocuments.forEach((proof) => {
      archive.file(proof.sourcePath, {
        name: `${packageName}/${proof.zipPath}`,
      });
    });
    archive.finalize().catch(rejectPromise);
  });
};

export class InvoiceExporter {
  constructor(
    private readonly db: DeductionsDatabase,
    private readonly profileDirectory: string,
  ) {}

  async listExportYearOptions(): Promise<ExportYearOption[]> {
    const rows = this.loadExportRows();
    const issues = await this.findProofIssues(rows);
    const issueItemIds = new Set(issues.map((issue) => issue.itemId));
    const byYear = new Map<number, ExportYearOption>();

    rows.forEach((row) => {
      const existing =
        byYear.get(row.taxYear) ??
        ({
          year: row.taxYear,
          acceptedItemCount: 0,
          inReviewItemCount: 0,
          includedItemCount: 0,
          includedAmount: 0,
          currency: 'EUR',
          issueCount: 0,
        } satisfies ExportYearOption);

      if (row.reviewStatus === 'accepted') {
        existing.acceptedItemCount += 1;
      } else {
        existing.inReviewItemCount += 1;
      }

      existing.includedItemCount += 1;
      existing.includedAmount += row.amountCents / 100;
      existing.issueCount += issueItemIds.has(row.itemId) ? 1 : 0;
      byYear.set(row.taxYear, existing);
    });

    return [...byYear.values()].sort((left, right) => right.year - left.year);
  }

  async exportInvoicesToTarget(
    request: ExportInvoicesRequest,
    target: ExportTarget,
  ): Promise<ExportInvoicesResult> {
    const results: ExportYearResult[] = [];

    for (const year of request.years) {
      results.push(await this.exportYear(year, target));
    }

    return { canceled: false, results };
  }

  private async exportYear(
    year: number,
    target: ExportTarget,
  ): Promise<ExportYearResult> {
    const rows = this.loadExportRows(year);

    if (rows.length === 0) {
      return {
        year,
        status: 'skipped',
        itemCount: 0,
        issueCount: 0,
        message: 'No accepted or in-review invoice items found.',
      };
    }

    const issues = await this.findProofIssues(rows);

    if (issues.length > 0) {
      return {
        year,
        status: 'failed',
        itemCount: rows.length,
        issueCount: issues.length,
        message: `Missing readable proof documents for ${issues.length} item(s): ${issues
          .map((issue) => issue.itemId)
          .join(', ')}`,
      };
    }

    const filePath =
      target.kind === 'single-file'
        ? target.filePath
        : join(target.directoryPath, `${packageNameForYear(year)}.zip`);

    if (target.kind === 'directory' && (await pathExists(filePath))) {
      return {
        year,
        status: 'failed',
        itemCount: rows.length,
        issueCount: 0,
        message: `Export package already exists: ${filePath}`,
      };
    }

    const proofPaths = buildProofFileNames(rows);
    const proofDocuments = [
      ...new Map(
        rows
          .filter((row) => row.documentId && row.storagePath)
          .map((row) => {
            const documentId = row.documentId ?? '';
            return [
              documentId,
              {
                documentId,
                sourcePath: resolveStoredDocumentPath(
                  this.profileDirectory,
                  row.storagePath ?? '',
                ) ?? '',
                zipPath: proofPaths.get(documentId) ?? '',
              },
            ];
          }),
      ).values(),
    ];

    try {
      await writeZipPackage({ year, filePath, rows, proofDocuments });
    } catch (error) {
      await unlink(filePath).catch(() => undefined);

      return {
        year,
        status: 'failed',
        itemCount: rows.length,
        issueCount: 0,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to create export package.',
      };
    }

    return {
      year,
      status: 'created',
      filePath,
      itemCount: rows.length,
      issueCount: 0,
    };
  }

  private loadExportRows(year?: number): ExportRow[] {
    const where = year
      ? and(
          eq(invoiceItems.taxYear, year),
          inArray(invoiceItems.reviewStatus, exportableStatuses),
        )
      : inArray(invoiceItems.reviewStatus, exportableStatuses);

    return this.db
      .select(selection)
      .from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .leftJoin(documents, eq(documents.id, invoices.documentId))
      .where(where)
      .orderBy(
        asc(invoices.invoiceDate),
        asc(invoices.vendor),
        asc(invoiceItems.sortOrder),
        asc(invoiceItems.createdAt),
      )
      .all() as ExportRow[];
  }

  private async findProofIssues(rows: ExportRow[]) {
    const issues: ExportIssue[] = [];
    const readableByStoragePath = new Map<string, boolean>();

    for (const row of rows) {
      if (!row.documentId || !row.storagePath) {
        issues.push({
          itemId: row.itemId,
          message: 'Invoice item has no linked proof document.',
        });
        continue;
      }

      const proofPath = resolveStoredDocumentPath(
        this.profileDirectory,
        row.storagePath,
      );

      if (!proofPath) {
        issues.push({
          itemId: row.itemId,
          message: 'Proof document path is outside the active profile.',
        });
        continue;
      }

      const cacheKey = `${row.documentId}:${proofPath}`;
      let readable = readableByStoragePath.get(cacheKey);

      if (readable === undefined) {
        readable = await canRead(proofPath);
        readableByStoragePath.set(cacheKey, readable);
      }

      if (!readable) {
        issues.push({
          itemId: row.itemId,
          message: 'Proof document file is missing or unreadable.',
        });
      }
    }

    return issues;
  }
}
