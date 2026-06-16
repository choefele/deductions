import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

import {
  currencies,
  documentStatuses,
  reviewStatuses,
  sourceKinds,
  taxCategoryIds,
} from '../../shared/data';

export const userProfile = sqliteTable('user_profile', {
  id: text('id').primaryKey(),
  displayName: text('display_name').notNull(),
  settingsJson: text('settings_json').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const sources = sqliteTable(
  'sources',
  {
    id: text('id').primaryKey(),
    kind: text('kind', { enum: sourceKinds }).notNull(),
    label: text('label').notNull(),
    status: text('status').notNull().default('active'),
    lastCheckedAt: integer('last_checked_at'),
    settingsJson: text('settings_json').notNull().default('{}'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('sources_kind_idx').on(table.kind)],
);

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    sourceId: text('source_id')
      .notNull()
      .references(() => sources.id),
    originalFileName: text('original_file_name').notNull(),
    storagePath: text('storage_path').notNull(),
    mimeType: text('mime_type').notNull(),
    sha256: text('sha256').notNull(),
    status: text('status', { enum: documentStatuses })
      .notNull()
      .default('imported'),
    processingStartedAt: integer('processing_started_at'),
    processingCompletedAt: integer('processing_completed_at'),
    processingError: text('processing_error'),
    processorVersion: text('processor_version'),
    importedAt: integer('imported_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('documents_sha256_unique').on(table.sha256),
    index('documents_source_id_idx').on(table.sourceId),
    index('documents_imported_at_idx').on(table.importedAt),
  ],
);

export const invoices = sqliteTable(
  'invoices',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id').references(() => documents.id),
    vendor: text('vendor').notNull(),
    invoiceDate: text('invoice_date').notNull(),
    invoiceNumber: text('invoice_number'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('invoices_invoice_unique')
      .on(table.invoiceNumber, table.vendor, table.invoiceDate)
      .where(sql`${table.invoiceNumber} is not null`),
  ],
);

export const invoiceItems = sqliteTable(
  'invoice_items',
  {
    id: text('id').primaryKey(),
    invoiceId: text('invoice_id')
      .notNull()
      .references(() => invoices.id),
    description: text('description').notNull(),
    amountCents: integer('amount_cents').notNull(),
    currency: text('currency', { enum: currencies }).notNull().default('EUR'),
    taxYear: integer('tax_year').notNull(),
    categoryId: text('category_id', { enum: taxCategoryIds }).notNull(),
    reviewStatus: text('review_status', {
      enum: reviewStatuses,
    }).notNull(),
    deductionReason: text('deduction_reason').notNull(),
    note: text('note'),
    sortOrder: integer('sort_order').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    index('invoice_items_invoice_id_idx').on(table.invoiceId),
    index('invoice_items_tax_year_idx').on(table.taxYear),
    index('invoice_items_tax_year_category_id_idx').on(
      table.taxYear,
      table.categoryId,
    ),
    index('invoice_items_review_status_idx').on(table.reviewStatus),
  ],
);

export type SourceRow = typeof sources.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type InvoiceRow = typeof invoices.$inferSelect;
export type InvoiceItemRow = typeof invoiceItems.$inferSelect;

export const schema = {
  userProfile,
  sources,
  documents,
  invoices,
  invoiceItems,
};
