import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import { eq, inArray } from 'drizzle-orm';

import { taxCategoryIds, type TaxCategoryId } from '../../shared/data';
import { documents, invoiceItems, invoices } from '../data/schema';
import type { DeductionsDatabase } from '../data/types';
import type {
  DocumentTextExtractor,
  InvoiceAiParser,
  ParsedInvoice,
  ParsedInvoiceDocument,
} from './types';

export const documentProcessorVersion = 'document-processor-v1';

const minimumReadableCharacters = 20;

export type ProcessStoredDocumentOptions = {
  db: DeductionsDatabase;
  profileDirectory: string;
  documentId: string;
  extractor: DocumentTextExtractor;
  parser: InvoiceAiParser;
  now?: Date;
};

type ValidInvoiceItem = {
  description: string;
  amountCents: number;
  taxYear: number;
  categoryId: TaxCategoryId;
  deductionReason: string;
  note: string | null;
};

type ValidInvoice = {
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string | null;
  items: ValidInvoiceItem[];
};

const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const taxYearFromDate = (invoiceDate: string) =>
  Number.parseInt(invoiceDate.slice(0, 4), 10);

const normalizeCategoryId = (categoryId: TaxCategoryId | null) =>
  categoryId && taxCategoryIds.includes(categoryId) ? categoryId : 'uncategorized';

const trimOrNull = (value: string | null) => {
  const trimmed = value?.trim() ?? '';

  return trimmed.length > 0 ? trimmed : null;
};

const validateParsedInvoice = (invoice: ParsedInvoice): ValidInvoice | null => {
  const vendor = trimOrNull(invoice.vendor);
  const invoiceDate = trimOrNull(invoice.invoiceDate);

  if (!vendor || !invoiceDate || !isIsoDate(invoiceDate)) {
    return null;
  }

  const defaultTaxYear = taxYearFromDate(invoiceDate);
  const items = invoice.items
    .map((item): ValidInvoiceItem | null => {
      const description = item.description.trim();
      const deductionReason = item.deductionReason.trim();
      const taxYear = item.taxYear ?? defaultTaxYear;

      if (
        description.length === 0 ||
        deductionReason.length === 0 ||
        !Number.isInteger(item.amountCents) ||
        item.amountCents <= 0 ||
        !Number.isInteger(taxYear)
      ) {
        return null;
      }

      return {
        description,
        amountCents: item.amountCents,
        taxYear,
        categoryId: normalizeCategoryId(item.categoryId),
        deductionReason,
        note: trimOrNull(item.note),
      };
    })
    .filter((item): item is ValidInvoiceItem => item !== null);

  if (items.length === 0) {
    return null;
  }

  return {
    vendor,
    invoiceDate,
    invoiceNumber: trimOrNull(invoice.invoiceNumber),
    items,
  };
};

const validateParsedDocument = (parsed: ParsedInvoiceDocument) => {
  if (parsed.documentType !== 'invoice' && parsed.documentType !== 'receipt') {
    throw new Error('AI did not find an invoice or receipt.');
  }

  const validInvoices = parsed.invoices
    .map(validateParsedInvoice)
    .filter((invoice): invoice is ValidInvoice => invoice !== null);

  if (validInvoices.length === 0) {
    throw new Error('No invoice with required fields and valid items was found.');
  }

  return validInvoices;
};

const documentStoragePath = (profileDirectory: string, storagePath: string) =>
  join(profileDirectory, ...storagePath.split('/'));

const markNeedsReview = (
  db: DeductionsDatabase,
  documentId: string,
  message: string,
  now: number,
) => {
  db.update(documents)
    .set({
      status: 'needs_review',
      processingCompletedAt: now,
      processingError: message,
      processorVersion: documentProcessorVersion,
      updatedAt: now,
    })
    .where(eq(documents.id, documentId))
    .run();
};

export const processStoredDocument = async ({
  db,
  profileDirectory,
  documentId,
  extractor,
  parser,
  now = new Date(),
}: ProcessStoredDocumentOptions) => {
  const startTime = now.getTime();
  const document = db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1)
    .get();

  if (!document) {
    throw new Error(`Document not found: ${documentId}`);
  }

  if (document.status === 'processed') {
    return;
  }

  db.update(documents)
    .set({
      status: 'processing',
      processingStartedAt: startTime,
      processingCompletedAt: null,
      processingError: null,
      processorVersion: documentProcessorVersion,
      updatedAt: startTime,
    })
    .where(eq(documents.id, documentId))
    .run();

  try {
    if (document.mimeType !== 'application/pdf') {
      throw new Error('Only PDF documents can be processed.');
    }

    const text = await extractor.extractText({
      documentId,
      filePath: documentStoragePath(profileDirectory, document.storagePath),
    });

    if (text.totalCharCount < minimumReadableCharacters) {
      throw new Error('No readable PDF text found. OCR is not supported yet.');
    }

    const parsed = await parser.parseInvoiceDocument({
      documentId,
      fileName: document.originalFileName,
      text,
    });
    const validInvoices = validateParsedDocument(parsed);
    const completedAt = Date.now();

    db.transaction((tx) => {
      const existingInvoices = tx
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.documentId, documentId))
        .all();
      const existingInvoiceIds = existingInvoices.map((invoice) => invoice.id);

      if (existingInvoiceIds.length > 0) {
        tx.delete(invoiceItems)
          .where(inArray(invoiceItems.invoiceId, existingInvoiceIds))
          .run();
        tx.delete(invoices)
          .where(inArray(invoices.id, existingInvoiceIds))
          .run();
      }

      validInvoices.forEach((invoice) => {
        const invoiceId = randomUUID();

        tx.insert(invoices)
          .values({
            id: invoiceId,
            documentId,
            vendor: invoice.vendor,
            invoiceDate: invoice.invoiceDate,
            invoiceNumber: invoice.invoiceNumber,
            createdAt: completedAt,
            updatedAt: completedAt,
          })
          .run();

        invoice.items.forEach((item, sortOrder) => {
          tx.insert(invoiceItems)
            .values({
              id: randomUUID(),
              invoiceId,
              description: item.description,
              amountCents: item.amountCents,
              currency: 'EUR',
              taxYear: item.taxYear,
              categoryId: item.categoryId,
              reviewStatus: 'pending',
              deductionReason: item.deductionReason,
              note: item.note,
              sortOrder,
              createdAt: completedAt,
              updatedAt: completedAt,
            })
            .run();
        });
      });

      tx.update(documents)
        .set({
          status: 'processed',
          processingCompletedAt: completedAt,
          processingError: null,
          processorVersion: documentProcessorVersion,
          updatedAt: completedAt,
        })
        .where(eq(documents.id, documentId))
        .run();
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Document processing failed.';
    markNeedsReview(db, documentId, message, Date.now());
  }
};
