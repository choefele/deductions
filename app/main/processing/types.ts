import type { TaxCategoryId } from '../../shared/data';

export type NormalizedDocumentText = {
  documentId: string;
  extractor: 'pdfjs';
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    charCount: number;
  }>;
  totalCharCount: number;
};

export type ParsedInvoiceDocument = {
  documentType: 'invoice' | 'receipt' | 'not_invoice' | 'unknown';
  invoices: ParsedInvoice[];
  warnings: string[];
};

export type ParsedInvoice = {
  vendor: string | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  currency: 'EUR';
  items: ParsedInvoiceItem[];
};

export type ParsedInvoiceItem = {
  description: string;
  amountCents: number;
  taxYear: number | null;
  categoryId: TaxCategoryId | null;
  deductionReason: string;
  note: string | null;
};

export type InvoiceAiParser = {
  parseInvoiceDocument(input: {
    documentId: string;
    fileName: string;
    text: NormalizedDocumentText;
  }): Promise<ParsedInvoiceDocument>;
};

export type DocumentTextExtractor = {
  extractText(input: {
    documentId: string;
    filePath: string;
  }): Promise<NormalizedDocumentText>;
};

export type AiProviderSettings = {
  providerKind: 'openai-compatible';
  providerLabel: string;
  baseUrl: string;
  modelId: string;
  apiKey: string;
};
