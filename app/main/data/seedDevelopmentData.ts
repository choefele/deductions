import { randomUUID } from 'node:crypto';

import type {
  ReviewStatus,
  TaxCategoryId,
} from '../../shared/deductions';
import { defaultSourceKind } from '../../shared/deductions';
import type { ProfileRegistryEntry } from './profileRegistry';
import type { DeductionsDrizzleDatabase } from './types';

type SeedInvoiceItem = {
  hasDocument: boolean;
  vendor: string;
  invoiceDate: string;
  invoiceNumber?: string;
  originalFileName?: string;
  description: string;
  amountCents: number;
  taxYear: number;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
  deductionReason: string;
  note?: string;
  updatedOffset: number;
};

export const ensureUserProfile = (
  db: DeductionsDrizzleDatabase,
  profile: ProfileRegistryEntry,
  now = Date.now(),
) => {
  db.$client
    .prepare(
      `
        insert into user_profile (
          id,
          display_name,
          settings_json,
          created_at,
          updated_at
        )
        values (
          @id,
          @displayName,
          '{}',
          @now,
          @now
        )
        on conflict(id) do update set
          display_name = excluded.display_name,
          updated_at = excluded.updated_at
      `,
    )
    .run({
      id: profile.id,
      displayName: profile.displayName,
      now,
    });
};

export const ensureManualUploadSource = (
  db: DeductionsDrizzleDatabase,
  now = Date.now(),
) => {
  const existing = db.$client
    .prepare('select id from sources where kind = ? order by created_at limit 1')
    .get(defaultSourceKind) as { id: string } | undefined;

  if (existing) {
    return existing.id;
  }

  const id = randomUUID();

  db.$client
    .prepare(
      `
        insert into sources (
          id,
          kind,
          label,
          status,
          settings_json,
          created_at,
          updated_at
        )
        values (?, ?, 'Manual upload', 'active', '{}', ?, ?)
      `,
    )
    .run(id, defaultSourceKind, now, now);

  return id;
};

const developmentItems: SeedInvoiceItem[] = [
  {
    hasDocument: true,
    vendor: 'Apple Store',
    invoiceDate: '2025-02-14',
    invoiceNumber: 'APL-2025-8841',
    originalFileName: 'apple-store-2025-02-14.pdf',
    description: 'MacBook Pro',
    amountCents: 129900,
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    reviewStatus: 'pending',
    deductionReason: 'Laptop purchase may be work-related, but private use should be clarified.',
    note: 'Used for client presentations and home office.',
    updatedOffset: 8,
  },
  {
    hasDocument: true,
    vendor: 'Amazon',
    invoiceDate: '2025-03-03',
    invoiceNumber: 'DE-552194',
    originalFileName: 'amazon-2025-03-03.pdf',
    description: 'Monitor arm and USB-C cables',
    amountCents: 18999,
    taxYear: 2025,
    categoryId: 'work-related-expenses',
    reviewStatus: 'accepted',
    deductionReason: 'Home office accessories used for professional work.',
    updatedOffset: 7,
  },
  {
    hasDocument: true,
    vendor: 'Techniker Krankenkasse',
    invoiceDate: '2025-01-31',
    invoiceNumber: 'TK-2025-017',
    originalFileName: 'tk-2025-01-31.pdf',
    description: 'Supplemental insurance statement',
    amountCents: 54000,
    taxYear: 2025,
    categoryId: 'special-expenses',
    reviewStatus: 'pending',
    deductionReason: 'Insurance-related document needs review before export.',
    updatedOffset: 6,
  },
  {
    hasDocument: false,
    vendor: 'CleanHome GmbH',
    invoiceDate: '2025-04-12',
    invoiceNumber: 'CH-9012',
    description: 'Household cleaning service',
    amountCents: 24000,
    taxYear: 2025,
    categoryId: 'household-services',
    reviewStatus: 'accepted',
    deductionReason: 'Household service invoice may require proof of non-cash payment.',
    note: 'Source document is missing, so this item has an export issue.',
    updatedOffset: 5,
  },
  {
    hasDocument: true,
    vendor: 'Cinema Mitte',
    invoiceDate: '2025-06-02',
    originalFileName: 'cinema-mitte-2025-06-02.pdf',
    description: 'Movie tickets',
    amountCents: 3200,
    taxYear: 2025,
    categoryId: 'uncategorized',
    reviewStatus: 'rejected',
    deductionReason: 'Personal entertainment purchase.',
    updatedOffset: 4,
  },
  {
    hasDocument: true,
    vendor: 'JetBrains',
    invoiceDate: '2024-09-01',
    invoiceNumber: 'JB-2024-923',
    originalFileName: 'jetbrains-2024-09-01.pdf',
    description: 'Developer tooling subscription',
    amountCents: 23900,
    taxYear: 2024,
    categoryId: 'work-related-expenses',
    reviewStatus: 'accepted',
    deductionReason: 'Developer tooling subscription for professional work.',
    updatedOffset: 3,
  },
  {
    hasDocument: true,
    vendor: 'Orthopaedie Zentrum',
    invoiceDate: '2024-11-18',
    invoiceNumber: 'OZ-7742',
    originalFileName: 'orthopaedie-zentrum-2024-11-18.pdf',
    description: 'Medical treatment invoice',
    amountCents: 41000,
    taxYear: 2024,
    categoryId: 'extraordinary-burdens',
    reviewStatus: 'pending',
    deductionReason: 'Medical expense may require threshold and context review.',
    updatedOffset: 2,
  },
  {
    hasDocument: true,
    vendor: 'Bookshop Central',
    invoiceDate: '2024-12-04',
    originalFileName: 'bookshop-central-2024-12-04.pdf',
    description: 'Personal book purchase',
    amountCents: 2450,
    taxYear: 2024,
    categoryId: 'uncategorized',
    reviewStatus: 'pending',
    deductionReason: 'No category has been confirmed yet.',
    updatedOffset: 1,
  },
];

const shaForId = (id: string) => id.replaceAll('-', '').padEnd(64, '0').slice(0, 64);

export const seedDevelopmentData = (
  db: DeductionsDrizzleDatabase,
  sourceId: string,
  now = Date.now(),
) => {
  const existing = db.$client
    .prepare('select count(*) as count from invoice_items')
    .get() as { count: number };

  if (existing.count > 0) {
    return;
  }

  const insertDocument = db.$client.prepare(`
    insert into documents (
      id,
      source_id,
      original_file_name,
      storage_path,
      mime_type,
      sha256,
      imported_at,
      created_at,
      updated_at
    )
    values (
      @id,
      @sourceId,
      @originalFileName,
      @storagePath,
      'application/pdf',
      @sha256,
      @timestamp,
      @timestamp,
      @timestamp
    )
  `);
  const insertInvoice = db.$client.prepare(`
    insert into invoices (
      id,
      document_id,
      vendor,
      invoice_date,
      invoice_number,
      created_at,
      updated_at
    )
    values (
      @id,
      @documentId,
      @vendor,
      @invoiceDate,
      @invoiceNumber,
      @timestamp,
      @timestamp
    )
  `);
  const insertItem = db.$client.prepare(`
    insert into invoice_items (
      id,
      invoice_id,
      description,
      amount_cents,
      currency,
      tax_year,
      category_id,
      review_status,
      deduction_reason,
      note,
      sort_order,
      created_at,
      updated_at
    )
    values (
      @id,
      @invoiceId,
      @description,
      @amountCents,
      'EUR',
      @taxYear,
      @categoryId,
      @reviewStatus,
      @deductionReason,
      @note,
      0,
      @timestamp,
      @timestamp
    )
  `);

  const transaction = db.$client.transaction(() => {
    developmentItems.forEach((item) => {
      const timestamp = now - item.updatedOffset * 1000;
      const documentId = item.hasDocument ? randomUUID() : null;
      const invoiceId = randomUUID();
      const invoiceItemId = randomUUID();

      if (documentId) {
        insertDocument.run({
          id: documentId,
          sourceId,
          originalFileName: item.originalFileName,
          storagePath: `documents/${item.taxYear}/${documentId}.pdf`,
          sha256: shaForId(documentId),
          timestamp,
        });
      }

      insertInvoice.run({
        id: invoiceId,
        documentId,
        vendor: item.vendor,
        invoiceDate: item.invoiceDate,
        invoiceNumber: item.invoiceNumber ?? null,
        timestamp,
      });

      insertItem.run({
        id: invoiceItemId,
        invoiceId,
        description: item.description,
        amountCents: item.amountCents,
        taxYear: item.taxYear,
        categoryId: item.categoryId,
        reviewStatus: item.reviewStatus,
        deductionReason: item.deductionReason,
        note: item.note ?? null,
        timestamp,
      });
    });
  });

  transaction();
};
