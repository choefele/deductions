import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Workbook } from 'exceljs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from '../../../app/main/data/database';
import { documents, invoiceItems, invoices } from '../../../app/main/data/schema';
import { InvoiceExporter } from '../../../app/main/exports/invoiceExporter';

const handles: DeductionsDatabaseHandle[] = [];
const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-export-test-'));
  tempDirectories.push(directory);
  return directory;
};

const openDatabase = () => {
  const handle = initializeDeductionsDatabase({
    appDataDirectory: createTempDirectory(),
    seedDevelopment: false,
    now: new Date('2026-01-15T12:00:00.000Z'),
  });
  handles.push(handle);
  return handle;
};

const createStoredDocument = (
  handle: DeductionsDatabaseHandle,
  {
    id,
    year,
    originalFileName,
    writeFile = true,
  }: {
    id: string;
    year: number;
    originalFileName: string;
    writeFile?: boolean;
  },
) => {
  const storagePath = `documents/${year}/${id}.pdf`;
  const absolutePath = join(handle.profileDirectory, storagePath);

  mkdirSync(join(handle.profileDirectory, 'documents', String(year)), {
    recursive: true,
  });

  if (writeFile) {
    writeFileSync(absolutePath, `%PDF-1.4\n${id}\n`);
  }

  handle.db
    .insert(documents)
    .values({
      id,
      sourceId: handle.manualUploadSourceId,
      originalFileName,
      storagePath,
      mimeType: 'application/pdf',
      sha256: id.padEnd(64, '0').slice(0, 64),
      status: 'processed',
      importedAt: Date.parse('2026-01-15T12:00:00.000Z'),
      createdAt: Date.parse('2026-01-15T12:00:00.000Z'),
      updatedAt: Date.parse('2026-01-15T12:00:00.000Z'),
    })
    .run();

  return storagePath;
};

const createInvoiceWithItems = (
  handle: DeductionsDatabaseHandle,
  {
    invoiceId,
    documentId,
    vendor,
    invoiceDate,
    invoiceNumber,
    items,
  }: {
    invoiceId: string;
    documentId: string | null;
    vendor: string;
    invoiceDate: string;
    invoiceNumber?: string;
    items: Array<{
      id: string;
      description: string;
      amountCents: number;
      taxYear: number;
      reviewStatus: 'accepted' | 'pending' | 'rejected';
      sortOrder: number;
    }>;
  },
) => {
  const now = Date.parse('2026-01-15T12:00:00.000Z');

  handle.db
    .insert(invoices)
    .values({
      id: invoiceId,
      documentId,
      vendor,
      invoiceDate,
      invoiceNumber: invoiceNumber ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  items.forEach((item) => {
    handle.db
      .insert(invoiceItems)
      .values({
        id: item.id,
        invoiceId,
        description: item.description,
        amountCents: item.amountCents,
        currency: 'EUR',
        taxYear: item.taxYear,
        categoryId: 'work-related-expenses',
        reviewStatus: item.reviewStatus,
        deductionReason: 'Business use',
        note: item.reviewStatus === 'pending' ? 'Needs confirmation' : null,
        sortOrder: item.sortOrder,
        createdAt: now + item.sortOrder,
        updatedAt: now + item.sortOrder,
      })
      .run();
  });
};

const zipEntries = (zipPath: string) =>
  execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .filter(Boolean);

const readZipEntry = (zipPath: string, entryName: string) =>
  execFileSync('unzip', ['-p', zipPath, entryName]);

afterEach(() => {
  while (handles.length > 0) {
    handles.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('InvoiceExporter', () => {
  it('lists exportable years with accepted and in-review counts', async () => {
    const handle = openDatabase();
    createStoredDocument(handle, {
      id: 'doc2025',
      year: 2025,
      originalFileName: 'Acme Invoice.pdf',
    });
    createInvoiceWithItems(handle, {
      invoiceId: 'invoice2025',
      documentId: 'doc2025',
      vendor: 'ACME GmbH',
      invoiceDate: '2025-01-14',
      invoiceNumber: 'AC-1',
      items: [
        {
          id: 'accepted2025',
          description: 'Laptop stand',
          amountCents: 12000,
          taxYear: 2025,
          reviewStatus: 'accepted',
          sortOrder: 0,
        },
        {
          id: 'pending2025',
          description: 'Keyboard',
          amountCents: 8000,
          taxYear: 2025,
          reviewStatus: 'pending',
          sortOrder: 1,
        },
        {
          id: 'rejected2025',
          description: 'Private gift',
          amountCents: 5000,
          taxYear: 2025,
          reviewStatus: 'rejected',
          sortOrder: 2,
        },
      ],
    });

    const options = await new InvoiceExporter(
      handle.db,
      handle.profileDirectory,
    ).listExportYearOptions();

    expect(options).toEqual([
      {
        year: 2025,
        acceptedItemCount: 1,
        inReviewItemCount: 1,
        includedItemCount: 2,
        includedAmount: 200,
        currency: 'EUR',
        issueCount: 0,
      },
    ]);
  });

  it('creates a zip package with one workbook row per accepted or pending item', async () => {
    const handle = openDatabase();
    createStoredDocument(handle, {
      id: 'docshared',
      year: 2025,
      originalFileName: 'Apple Store 2025.pdf',
    });
    createInvoiceWithItems(handle, {
      invoiceId: 'invoice2025',
      documentId: 'docshared',
      vendor: 'Apple Store',
      invoiceDate: '2025-01-14',
      invoiceNumber: 'APL-1',
      items: [
        {
          id: 'accepted2025',
          description: 'MacBook Pro',
          amountCents: 129900,
          taxYear: 2025,
          reviewStatus: 'accepted',
          sortOrder: 0,
        },
        {
          id: 'pending2025',
          description: 'USB-C adapter',
          amountCents: 4900,
          taxYear: 2025,
          reviewStatus: 'pending',
          sortOrder: 1,
        },
        {
          id: 'rejected2025',
          description: 'Movie rental',
          amountCents: 500,
          taxYear: 2025,
          reviewStatus: 'rejected',
          sortOrder: 2,
        },
      ],
    });
    const outputDirectory = createTempDirectory();
    const exporter = new InvoiceExporter(handle.db, handle.profileDirectory);

    const result = await exporter.exportInvoicesToTarget(
      { years: [2025] },
      { kind: 'directory', directoryPath: outputDirectory },
    );

    expect(result).toEqual({
      canceled: false,
      results: [
        expect.objectContaining({
          year: 2025,
          status: 'created',
          itemCount: 2,
          issueCount: 0,
        }),
      ],
    });

    const zipPath = join(outputDirectory, 'Deductions-export-2025.zip');
    const entries = zipEntries(zipPath);

    expect(entries).toEqual([
      'Deductions-export-2025/invoices-2025.xlsx',
      'Deductions-export-2025/documents/2025-01-14-apple-store-macbook-pro.pdf',
    ]);

    const workbook = new Workbook();
    await workbook.xlsx.load(
      readZipEntry(
        zipPath,
        'Deductions-export-2025/invoices-2025.xlsx',
      ) as never,
    );
    const overviewSheet = workbook.getWorksheet('Overview');
    const invoicesSheet = workbook.getWorksheet('Invoices');
    const rows = invoicesSheet?.getSheetValues() ?? [];

    expect(overviewSheet?.getCell('A1').value).toBe('Deductions export 2025');
    expect(overviewSheet?.getCell('A1').font).toMatchObject({
      bold: true,
      size: 16,
    });
    expect(overviewSheet?.getRow(2).getCell(1).value).toBe('Created at');
    expect(typeof overviewSheet?.getRow(2).getCell(2).value).toBe('string');
    expect(overviewSheet?.getRow(3).values).toEqual([
      undefined,
      'Tax year',
      2025,
    ]);
    expect(overviewSheet?.getRow(4).values).toEqual([
      undefined,
      'Included statuses',
      'Accepted and in-review invoice items are included.',
    ]);
    expect(overviewSheet?.getRow(6).values).toEqual([
      undefined,
      'Summary',
      undefined,
      'Item count',
      'Amount',
      'Currency',
    ]);
    expect(overviewSheet?.getRow(7).values).toEqual([
      undefined,
      'Accepted total',
      'Accepted items currently included in the dashboard amount.',
      1,
      1299,
      'EUR',
    ]);
    expect(overviewSheet?.getRow(8).values).toEqual([
      undefined,
      'Accepted + in-review total',
      'Includes 49.00 EUR from 1 item(s) still in review.',
      2,
      1348,
      'EUR',
    ]);
    expect(overviewSheet?.getRow(10).values).toEqual([
      undefined,
      'Items by status',
      undefined,
      'Item count',
      'Amount',
      'Currency',
    ]);
    expect(overviewSheet?.getRow(11).values).toEqual([
      undefined,
      'Review',
      'Still needs a decision before filing.',
      1,
      49,
      'EUR',
    ]);
    expect(overviewSheet?.getRow(12).values).toEqual([
      undefined,
      'Accepted',
      'Included in the accepted total.',
      1,
      1299,
      'EUR',
    ]);
    expect(overviewSheet?.getColumn(1).values).not.toContain('Rejected');
    expect(overviewSheet?.getRow(11).getCell(1).fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF3CD' },
    });
    expect(overviewSheet?.getRow(15).values).toEqual([
      undefined,
      'Proof files',
      'Document file names correspond to the "Proof file" column in the Invoices sheet.',
    ]);

    expect((rows[1] as unknown[]).slice(1, 4)).toEqual([
      'Tax year',
      'Review status',
      'Category',
    ]);
    expect(rows[1]).not.toContain('Original file name');
    expect((rows[2] as unknown[]).slice(1, 10)).toEqual([
      2025,
      'Accepted',
      'Work-related expenses',
      'Apple Store',
      new Date('2025-01-14T00:00:00.000Z'),
      'APL-1',
      'MacBook Pro',
      1299,
      'EUR',
    ]);
    expect((rows[3] as unknown[]).slice(1, 10)).toEqual([
      2025,
      'In review',
      'Work-related expenses',
      'Apple Store',
      new Date('2025-01-14T00:00:00.000Z'),
      'APL-1',
      'USB-C adapter',
      49,
      'EUR',
    ]);
    expect(invoicesSheet?.getRow(2).getCell(12).value).toBe(
      'documents/2025-01-14-apple-store-macbook-pro.pdf',
    );
    expect(invoicesSheet?.getRow(3).getCell(12).value).toBe(
      'documents/2025-01-14-apple-store-macbook-pro.pdf',
    );
    expect(invoicesSheet?.getRow(3).getCell(2).fill).toMatchObject({
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF3CD' },
    });
    expect(rows[4]).toBeUndefined();
  });

  it('blocks a year export when an included item has no readable proof file', async () => {
    const handle = openDatabase();
    createStoredDocument(handle, {
      id: 'docmissing',
      year: 2025,
      originalFileName: 'Missing Proof.pdf',
      writeFile: false,
    });
    createInvoiceWithItems(handle, {
      invoiceId: 'invoice2025',
      documentId: 'docmissing',
      vendor: 'CleanHome GmbH',
      invoiceDate: '2025-04-12',
      invoiceNumber: 'CH-1',
      items: [
        {
          id: 'accepted2025',
          description: 'Household cleaning',
          amountCents: 24000,
          taxYear: 2025,
          reviewStatus: 'accepted',
          sortOrder: 0,
        },
      ],
    });
    const outputDirectory = createTempDirectory();

    const result = await new InvoiceExporter(
      handle.db,
      handle.profileDirectory,
    ).exportInvoicesToTarget(
      { years: [2025] },
      { kind: 'directory', directoryPath: outputDirectory },
    );

    expect(result).toEqual({
      canceled: false,
      results: [
        {
          year: 2025,
          status: 'failed',
          itemCount: 1,
          issueCount: 1,
          message:
            'Missing readable proof documents for 1 item(s): accepted2025',
        },
      ],
    });
    expect(existsSync(join(outputDirectory, 'Deductions-export-2025.zip'))).toBe(
      false,
    );
  });
});
