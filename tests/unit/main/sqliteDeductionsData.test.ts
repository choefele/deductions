import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from '../../../app/main/data/database';

const handles: DeductionsDatabaseHandle[] = [];
const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-test-'));
  tempDirectories.push(directory);
  return directory;
};

const openDatabase = (seedDevelopment = true) => {
  const handle = initializeDeductionsDatabase({
    appDataDirectory: createTempDirectory(),
    seedDevelopment,
    now: new Date('2026-01-15T12:00:00.000Z'),
  });
  handles.push(handle);
  return handle;
};

afterEach(() => {
  while (handles.length > 0) {
    handles.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('SqliteDeductionsData', () => {
  it('creates and reopens the default active profile registry', () => {
    const appDataDirectory = createTempDirectory();
    const first = initializeDeductionsDatabase({
      appDataDirectory,
      seedDevelopment: false,
      now: new Date('2026-01-15T12:00:00.000Z'),
    });
    handles.push(first);

    expect(existsSync(join(appDataDirectory, 'profiles.json'))).toBe(true);
    expect(existsSync(first.databasePath)).toBe(true);
    expect(existsSync(join(first.profileDirectory, 'documents'))).toBe(true);
    expect(first.activeProfile.displayName).toBe('Local profile');

    first.close();
    handles.pop();

    const second = initializeDeductionsDatabase({
      appDataDirectory,
      seedDevelopment: false,
      now: new Date('2026-01-16T12:00:00.000Z'),
    });
    handles.push(second);

    expect(second.activeProfile.id).toBe(first.activeProfile.id);
    expect(second.databasePath).toBe(first.databasePath);
  });

  it('seeds system categories in sort order', async () => {
    const handle = openDatabase(false);

    await expect(handle.data.listCategories()).resolves.toEqual([
      expect.objectContaining({ id: 'work-related-expenses' }),
      expect.objectContaining({ id: 'special-expenses' }),
      expect.objectContaining({ id: 'extraordinary-burdens' }),
      expect.objectContaining({ id: 'household-services' }),
      expect.objectContaining({ id: 'uncategorized' }),
    ]);
  });

  it('aggregates the seeded development data by tax year', async () => {
    const handle = openDatabase();

    const summary = await handle.data.getAllYearsSummary();

    expect(summary.years.map((year) => year.year)).toEqual([2025, 2024]);
    expect(summary.counts).toEqual({
      pending: 4,
      accepted: 3,
      rejected: 1,
    });
    expect(summary.recentInvoiceItems).toHaveLength(5);
    expect(summary.recentInvoiceItems[0]).toEqual(
      expect.objectContaining({
        vendor: 'Bookshop Central',
        amount: 24.5,
        currency: 'EUR',
      }),
    );
  });

  it('returns null for a tax year without invoice items', async () => {
    const handle = openDatabase();

    await expect(handle.data.getTaxYearSummary(2030)).resolves.toBeNull();
  });

  it('filters invoice items by tax year and category', async () => {
    const handle = openDatabase();

    const items = await handle.data.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );

    expect(items.map((item) => item.vendor)).toEqual(['Amazon', 'Apple Store']);
    expect(items.every((item) => item.taxYear === 2025)).toBe(true);
    expect(
      items.every((item) => item.categoryId === 'work-related-expenses'),
    ).toBe(true);
  });

  it('filters invoice items by review status', async () => {
    const handle = openDatabase();

    const pending = await handle.data.listInvoiceItemsByReviewStatus('pending');
    const accepted = await handle.data.listInvoiceItemsByReviewStatus('accepted');

    expect(pending).toHaveLength(4);
    expect(pending.every((item) => item.reviewStatus === 'pending')).toBe(true);
    expect(accepted).toHaveLength(3);
    expect(accepted.every((item) => item.reviewStatus === 'accepted')).toBe(true);
  });

  it('returns invoice item details with joined document metadata', async () => {
    const handle = openDatabase();
    const items = await handle.data.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );
    const appleItem = items.find((item) => item.vendor === 'Apple Store');

    expect(appleItem).toBeDefined();

    const item = await handle.data.getInvoiceItemById(appleItem?.id ?? '');

    expect(item).toEqual(
      expect.objectContaining({
        id: appleItem?.id,
        invoiceId: appleItem?.invoiceId,
        vendor: 'Apple Store',
        amount: 1299,
        deductionReason:
          'Laptop purchase may be work-related, but private use should be clarified.',
        document: expect.objectContaining({
          storagePath: expect.stringMatching(/^documents\/2025\/.+\.pdf$/),
          sourceLabel: 'Manual upload',
          status: 'needs_review',
        }),
      }),
    );
  });

  it('updates invoice and item review fields in one persisted review save', async () => {
    const handle = openDatabase();
    const items = await handle.data.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );
    const appleItem = items.find((item) => item.vendor === 'Apple Store');

    expect(appleItem).toBeDefined();

    const updated = await handle.data.updateInvoiceItemReview({
      invoiceItemId: appleItem?.id ?? '',
      invoice: {
        vendor: 'Apple Retail Germany',
        invoiceDate: '2025-02-15',
        invoiceNumber: 'APL-UPDATED',
      },
      item: {
        description: 'MacBook Pro and adapter',
        amount: 1400.25,
        taxYear: 2025,
        categoryId: 'special-expenses',
        deductionReason: 'Manually reviewed context.',
        note: 'Accepted after checking the source invoice.',
        reviewStatus: 'accepted',
      },
    });

    expect(updated).toEqual(
      expect.objectContaining({
        id: appleItem?.id,
        invoiceId: appleItem?.invoiceId,
        vendor: 'Apple Retail Germany',
        invoiceDate: '2025-02-15',
        invoiceNumber: 'APL-UPDATED',
        description: 'MacBook Pro and adapter',
        amount: 1400.25,
        taxYear: 2025,
        categoryId: 'special-expenses',
        deductionReason: 'Manually reviewed context.',
        note: 'Accepted after checking the source invoice.',
        reviewStatus: 'accepted',
      }),
    );
    await expect(
      handle.data.getInvoiceItemById(appleItem?.id ?? ''),
    ).resolves.toEqual(updated);
    await expect(handle.data.getAllYearsSummary()).resolves.toEqual(
      expect.objectContaining({
        counts: {
          pending: 3,
          accepted: 4,
          rejected: 1,
        },
      }),
    );

    const remainingWorkItems = await handle.data.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );
    expect(remainingWorkItems.map((item) => item.vendor)).toEqual(['Amazon']);
  });

  it('rejects invalid review update values before persistence', async () => {
    const handle = openDatabase();
    const pending = await handle.data.listInvoiceItemsByReviewStatus('pending');
    const item = pending[0];

    await expect(
      handle.data.updateInvoiceItemReview({
        invoiceItemId: item.id,
        invoice: {
          vendor: '',
          invoiceDate: '2025-02-15',
        },
        item: {
          description: item.description,
          amount: item.amount,
          taxYear: item.taxYear,
          categoryId: item.categoryId,
          reviewStatus: 'accepted',
        },
      }),
    ).rejects.toThrow(/invalid vendor/);

    await expect(handle.data.getInvoiceItemById(item.id)).resolves.toEqual(
      expect.objectContaining({
        vendor: item.vendor,
        reviewStatus: 'pending',
      }),
    );
  });

  it('returns invoice details with all invoice items', async () => {
    const handle = openDatabase();
    const items = await handle.data.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );
    const appleItem = items.find((item) => item.vendor === 'Apple Store');

    expect(appleItem).toBeDefined();

    const invoice = await handle.data.getInvoiceById(appleItem?.invoiceId ?? '');

    expect(invoice).toEqual(
      expect.objectContaining({
        id: appleItem?.invoiceId,
        documentId: appleItem?.documentId,
        items: [expect.objectContaining({ id: appleItem?.id })],
      }),
    );
  });

  it('counts source documents, invoices, and invoice items', async () => {
    const handle = openDatabase();

    await expect(handle.data.listSources()).resolves.toEqual([
      expect.objectContaining({
        kind: 'manual-upload',
        label: 'Manual upload',
        documentCount: 7,
        invoiceCount: 7,
        invoiceItemCount: 7,
      }),
    ]);
  });

  it('lists document summaries and detail from existing document records', async () => {
    const handle = openDatabase();

    const summaries = await handle.data.listDocumentSummaries();
    const appleDocument = summaries.find(
      (document) =>
        document.originalFileName === 'apple-store-2025-02-14.pdf',
    );

    expect(summaries).toHaveLength(7);
    expect([...new Set(summaries.map((document) => document.status))].sort()).toEqual([
      'imported',
      'needs_review',
      'processed',
      'processing',
    ]);
    expect(appleDocument).toEqual(
      expect.objectContaining({
        sourceLabel: 'Manual upload',
        status: 'needs_review',
        invoiceCount: 1,
        invoiceItemCount: 1,
        pendingItemCount: 1,
        taxYears: [2025],
      }),
    );

    const detail = await handle.data.getDocumentDetail(appleDocument?.id ?? '');

    expect(detail).toEqual(
      expect.objectContaining({
        id: appleDocument?.id,
        invoices: [
          expect.objectContaining({
            vendor: 'Apple Store',
            items: [expect.objectContaining({ description: 'MacBook Pro' })],
          }),
        ],
      }),
    );
  });

  it('deletes a document with its invoices and invoice items', async () => {
    const handle = openDatabase();
    const summaries = await handle.data.listDocumentSummaries();
    const appleDocument = summaries.find(
      (document) =>
        document.originalFileName === 'apple-store-2025-02-14.pdf',
    );
    const detail = await handle.data.getDocumentDetail(appleDocument?.id ?? '');
    const invoiceId = detail?.invoices[0]?.id ?? '';
    const invoiceItemId = detail?.invoices[0]?.items[0]?.id ?? '';

    await expect(
      handle.data.deleteDocument(appleDocument?.id ?? ''),
    ).resolves.toBe(true);

    await expect(
      handle.data.getDocumentDetail(appleDocument?.id ?? ''),
    ).resolves.toBeNull();
    await expect(handle.data.getInvoiceById(invoiceId)).resolves.toBeNull();
    await expect(
      handle.data.getInvoiceItemById(invoiceItemId),
    ).resolves.toBeNull();

    const remainingSummaries = await handle.data.listDocumentSummaries();
    const sources = await handle.data.listSources();

    expect(remainingSummaries).toHaveLength(6);
    expect(sources[0]).toEqual(
      expect.objectContaining({
        documentCount: 6,
        invoiceCount: 6,
        invoiceItemCount: 6,
      }),
    );
    await expect(handle.data.deleteDocument('missing-document')).resolves.toBe(
      false,
    );
  });

  it('keeps separate profile databases isolated', async () => {
    const seeded = openDatabase(true);
    const empty = openDatabase(false);

    await expect(seeded.data.listTaxYears()).resolves.toHaveLength(2);
    await expect(empty.data.listTaxYears()).resolves.toEqual([]);
  });
});
