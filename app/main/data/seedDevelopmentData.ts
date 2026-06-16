import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

import type {
  DocumentStatus,
  ReviewStatus,
  TaxCategoryId,
} from '../../shared/data';
import { defaultSourceKind } from '../../shared/data';
import type { ProfileRegistryEntry } from './profileRegistry';
import { documents, invoiceItems, invoices, sources, userProfile } from './schema';
import type { DeductionsDatabase } from './types';

type SeedInvoiceItem = {
  hasDocument: boolean;
  documentStatus?: DocumentStatus;
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
  db: DeductionsDatabase,
  profile: ProfileRegistryEntry,
  now = Date.now(),
) => {
  db.insert(userProfile)
    .values({
      id: profile.id,
      displayName: profile.displayName,
      settingsJson: '{}',
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: userProfile.id,
      set: {
        displayName: profile.displayName,
        updatedAt: now,
      },
    })
    .run();
};

export const ensureManualUploadSource = (
  db: DeductionsDatabase,
  now = Date.now(),
) => {
  const existing = db
    .select({ id: sources.id })
    .from(sources)
    .where(eq(sources.kind, defaultSourceKind))
    .orderBy(sources.createdAt)
    .limit(1)
    .get();

  if (existing) {
    return existing.id;
  }

  const id = randomUUID();

  db.insert(sources)
    .values({
      id,
      kind: defaultSourceKind,
      label: 'Manual upload',
      status: 'active',
      settingsJson: '{}',
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return id;
};

const developmentItems: SeedInvoiceItem[] = [
  {
    hasDocument: true,
    documentStatus: 'needs_review',
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
    documentStatus: 'processed',
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
    documentStatus: 'processing',
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
    documentStatus: 'processed',
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
    documentStatus: 'processed',
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
    documentStatus: 'needs_review',
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
    documentStatus: 'imported',
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
  db: DeductionsDatabase,
  sourceId: string,
  now = Date.now(),
) => {
  const existing = db
    .select({ id: invoiceItems.id })
    .from(invoiceItems)
    .limit(1)
    .get();

  if (existing) {
    return;
  }

  db.transaction((tx) => {
    developmentItems.forEach((item) => {
      const timestamp = now - item.updatedOffset * 1000;
      const documentId = item.hasDocument ? randomUUID() : null;
      const invoiceId = randomUUID();
      const invoiceItemId = randomUUID();

      if (documentId) {
        tx.insert(documents).values({
          id: documentId,
          sourceId,
          originalFileName: item.originalFileName ?? '',
          storagePath: `documents/${item.taxYear}/${documentId}.pdf`,
          mimeType: 'application/pdf',
          sha256: shaForId(documentId),
          status: item.documentStatus ?? 'processed',
          importedAt: timestamp,
          createdAt: timestamp,
          updatedAt: timestamp,
        }).run();
      }

      tx.insert(invoices).values({
        id: invoiceId,
        documentId,
        vendor: item.vendor,
        invoiceDate: item.invoiceDate,
        invoiceNumber: item.invoiceNumber ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).run();

      tx.insert(invoiceItems).values({
        id: invoiceItemId,
        invoiceId,
        description: item.description,
        amountCents: item.amountCents,
        currency: 'EUR',
        taxYear: item.taxYear,
        categoryId: item.categoryId,
        reviewStatus: item.reviewStatus,
        deductionReason: item.deductionReason,
        note: item.note ?? null,
        sortOrder: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }).run();
    });
  });
};
