import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject } from 'ai';
import { z } from 'zod/v4';

import { taxCategoryIds } from '../../shared/data';
import type { AiProviderSettings, InvoiceAiParser, NormalizedDocumentText } from './types';

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  amountCents: z.number().int(),
  taxYear: z.number().int().nullable(),
  categoryId: z.enum(taxCategoryIds).nullable(),
  deductionReason: z.string().min(1),
  note: z.string().nullable(),
});

const invoiceSchema = z.object({
  vendor: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  currency: z.literal('EUR'),
  items: z.array(invoiceItemSchema),
});

const parsedInvoiceDocumentSchema = z.object({
  documentType: z.enum(['invoice', 'receipt', 'not_invoice', 'unknown']),
  invoices: z.array(invoiceSchema),
  warnings: z.array(z.string()),
});

const renderDocumentText = (text: NormalizedDocumentText) =>
  text.pages
    .map((page) => `--- Page ${page.pageNumber} ---\n${page.text}`)
    .join('\n\n');

export class AiSdkInvoiceParser implements InvoiceAiParser {
  private readonly provider;

  constructor(private readonly settings: AiProviderSettings) {
    this.provider = createOpenAICompatible({
      name: settings.providerLabel,
      baseURL: settings.baseUrl,
      apiKey: settings.apiKey,
      supportsStructuredOutputs: true,
    });
  }

  async parseInvoiceDocument(input: {
    documentId: string;
    fileName: string;
    text: NormalizedDocumentText;
  }) {
    const result = await generateObject({
      model: this.provider.chatModel(this.settings.modelId),
      schema: parsedInvoiceDocumentSchema,
      schemaName: 'ParsedInvoiceDocument',
      schemaDescription: 'Structured invoice and receipt extraction result.',
      system:
        'Extract German tax-relevant invoice or receipt data from PDF text. ' +
        'Return only facts supported by the text. Use EUR amounts in integer cents. ' +
        'If a category is uncertain, use null. If tax year is uncertain, use null. ' +
        'If the document is not an invoice or receipt, return documentType not_invoice and no invoices.',
      prompt:
        `File name: ${input.fileName}\n` +
        `Document id: ${input.documentId}\n\n` +
        renderDocumentText(input.text),
    });

    return result.object;
  }
}
