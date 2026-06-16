import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from '../../../app/main/data/database';
import { documents, invoiceItems, invoices } from '../../../app/main/data/schema';
import { processStoredDocument } from '../../../app/main/processing/documentProcessor';
import type {
  DocumentTextExtractor,
  InvoiceAiParser,
  NormalizedDocumentText,
  ParsedInvoiceDocument,
} from '../../../app/main/processing/types';

const handles: DeductionsDatabaseHandle[] = [];
const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-processor-test-'));
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

const insertDocument = (
  handle: DeductionsDatabaseHandle,
  status: 'imported' | 'needs_review' = 'imported',
) => {
  handle.db
    .insert(documents)
    .values({
      id: 'doc-1',
      sourceId: handle.manualUploadSourceId,
      originalFileName: 'invoice.pdf',
      storagePath: 'documents/unassigned/doc-1.pdf',
      mimeType: 'application/pdf',
      sha256: 'a'.repeat(64),
      status,
      importedAt: Date.parse('2026-02-01T10:00:00.000Z'),
      createdAt: Date.parse('2026-02-01T10:00:00.000Z'),
      updatedAt: Date.parse('2026-02-01T10:00:00.000Z'),
    })
    .run();
};

const textFixture = (totalCharCount = 100): NormalizedDocumentText => ({
  documentId: 'doc-1',
  extractor: 'pdfjs',
  pageCount: 1,
  pages: [
    {
      pageNumber: 1,
      text: 'Vendor Example invoice text with one deductible item.',
      charCount: totalCharCount,
    },
  ],
  totalCharCount,
});

const extractor = (text = textFixture()): DocumentTextExtractor => ({
  extractText: async () => text,
});

const parser = (parsed: ParsedInvoiceDocument): InvoiceAiParser => ({
  parseInvoiceDocument: async () => parsed,
});

const validParsedDocument = (): ParsedInvoiceDocument => ({
  documentType: 'invoice',
  warnings: [],
  invoices: [
    {
      vendor: 'Vendor Example',
      invoiceDate: '2025-03-04',
      invoiceNumber: 'INV-1',
      currency: 'EUR',
      items: [
        {
          description: 'Desk lamp',
          amountCents: 4999,
          taxYear: null,
          categoryId: null,
          deductionReason: 'Used in home office.',
          note: null,
        },
      ],
    },
  ],
});

afterEach(() => {
  while (handles.length > 0) {
    handles.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('processStoredDocument', () => {
  it('creates pending invoice items and marks the document processed', async () => {
    const handle = openDatabase();
    insertDocument(handle);

    await processStoredDocument({
      db: handle.db,
      profileDirectory: handle.profileDirectory,
      documentId: 'doc-1',
      extractor: extractor(),
      parser: parser(validParsedDocument()),
      now: new Date('2026-02-10T12:00:00.000Z'),
    });

    const document = handle.db
      .select()
      .from(documents)
      .where(eq(documents.id, 'doc-1'))
      .get();
    const invoice = handle.db.select().from(invoices).get();
    const item = handle.db.select().from(invoiceItems).get();

    expect(document).toEqual(
      expect.objectContaining({
        status: 'processed',
        processingError: null,
        processorVersion: 'document-processor-v1',
      }),
    );
    expect(invoice).toEqual(
      expect.objectContaining({
        documentId: 'doc-1',
        vendor: 'Vendor Example',
        invoiceDate: '2025-03-04',
      }),
    );
    expect(item).toEqual(
      expect.objectContaining({
        reviewStatus: 'pending',
        taxYear: 2025,
        categoryId: 'uncategorized',
        amountCents: 4999,
      }),
    );
  });

  it('marks the document needs_review when no readable text is found', async () => {
    const handle = openDatabase();
    insertDocument(handle);

    await processStoredDocument({
      db: handle.db,
      profileDirectory: handle.profileDirectory,
      documentId: 'doc-1',
      extractor: extractor(textFixture(0)),
      parser: parser(validParsedDocument()),
    });

    const document = handle.db
      .select()
      .from(documents)
      .where(eq(documents.id, 'doc-1'))
      .get();

    expect(document).toEqual(
      expect.objectContaining({
        status: 'needs_review',
        processingError: 'No readable PDF text found. OCR is not supported yet.',
      }),
    );
    expect(handle.db.select().from(invoices).all()).toEqual([]);
  });

  it('marks the document needs_review when AI finds no invoice', async () => {
    const handle = openDatabase();
    insertDocument(handle);

    await processStoredDocument({
      db: handle.db,
      profileDirectory: handle.profileDirectory,
      documentId: 'doc-1',
      extractor: extractor(),
      parser: parser({
        documentType: 'not_invoice',
        invoices: [],
        warnings: [],
      }),
    });

    const document = handle.db
      .select()
      .from(documents)
      .where(eq(documents.id, 'doc-1'))
      .get();

    expect(document).toEqual(
      expect.objectContaining({
        status: 'needs_review',
        processingError: 'AI did not find an invoice or receipt.',
      }),
    );
  });

  it('replaces existing document invoices on retry success', async () => {
    const handle = openDatabase();
    insertDocument(handle, 'needs_review');
    handle.db
      .insert(invoices)
      .values({
        id: 'invoice-old',
        documentId: 'doc-1',
        vendor: 'Old vendor',
        invoiceDate: '2024-01-01',
        invoiceNumber: 'OLD-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .run();
    handle.db
      .insert(invoiceItems)
      .values({
        id: 'item-old',
        invoiceId: 'invoice-old',
        description: 'Old item',
        amountCents: 100,
        currency: 'EUR',
        taxYear: 2024,
        categoryId: 'uncategorized',
        reviewStatus: 'pending',
        deductionReason: 'Old reason',
        note: null,
        sortOrder: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
      .run();

    await processStoredDocument({
      db: handle.db,
      profileDirectory: handle.profileDirectory,
      documentId: 'doc-1',
      extractor: extractor(),
      parser: parser({
        ...validParsedDocument(),
        invoices: [
          {
            ...validParsedDocument().invoices[0],
            invoiceNumber: 'INV-2',
            items: [
              {
                ...validParsedDocument().invoices[0].items[0],
                description: 'Replacement item',
                amountCents: 1299,
              },
            ],
          },
        ],
      }),
    });

    expect(handle.db.select().from(invoices).all()).toHaveLength(1);
    expect(handle.db.select().from(invoiceItems).all()).toEqual([
      expect.objectContaining({
        description: 'Replacement item',
        amountCents: 1299,
      }),
    ]);
  });
});
