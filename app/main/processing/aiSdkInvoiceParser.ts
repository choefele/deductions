import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { generateObject } from 'ai';
import { z } from 'zod/v4';

import type { AiProviderSettings, InvoiceAiParser, NormalizedDocumentText } from './types';

const invoiceItemSchema = z.object({
  description: z.string().min(1),
  amountText: z
    .string()
    .min(1)
    .describe('Exact gross line-item subtotal including VAT as printed, for example 5,53 € or €5.53.'),
});

const invoiceSchema = z.object({
  vendor: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  invoiceNumber: z.string().nullable(),
  currency: z.literal('EUR'),
  items: z.array(invoiceItemSchema),
});

const parsedInvoiceDocumentSchema = z.object({
  isInvoiceLike: z.boolean(),
  invoices: z.array(invoiceSchema),
});

const renderDocumentText = (text: NormalizedDocumentText) =>
  text.pages
    .map((page) => `--- Page ${page.pageNumber} ---\n${page.text}`)
    .join('\n\n');

const systemPrompt =
  'Extract factual invoice or receipt data from PDF text. ' +
  'Return only facts supported by the text. Use ISO dates in YYYY-MM-DD format when a full date is available. ' +
  'For each item, amountText is the exact gross line-item subtotal including VAT as printed, for example 5,53 € or 5.53 EUR. ' +
  'Ignore invoice totals, payment amounts, shipping rows, discount rows, and VAT summary rows. ' +
  'If this is not an invoice or receipt, set isInvoiceLike to false and return no invoices.';

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
      system: systemPrompt,
      prompt:
        `File name: ${input.fileName}\n` +
        `Document id: ${input.documentId}\n\n` +
        renderDocumentText(input.text),
    });

    return result.object;
  }
}
