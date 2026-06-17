import { createServer, type IncomingMessage } from 'node:http';
import { once } from 'node:events';

import { afterEach, describe, expect, it } from 'vitest';

import { AiSdkInvoiceParser } from '../../../app/main/processing/aiSdkInvoiceParser';
import type { NormalizedDocumentText } from '../../../app/main/processing/types';

const servers: ReturnType<typeof createServer>[] = [];

const readJsonBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<
    string,
    unknown
  >;
};

const listen = async (handler: (body: Record<string, unknown>) => void) => {
  const server = createServer(async (request, response) => {
    const body = await readJsonBody(request);
    handler(body);
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(
      JSON.stringify({
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'test-model',
        choices: [
          {
            index: 0,
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: JSON.stringify({
                isInvoiceLike: true,
                invoices: [
                  {
                    vendor: 'Vendor Example',
                    invoiceDate: '2026-01-02',
                    invoiceNumber: null,
                    currency: 'EUR',
                    items: [
                      {
                        description: 'Office chair',
                        amountText: '123,45 €',
                      },
                    ],
                  },
                ],
              }),
            },
          },
        ],
      }),
    );
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  servers.push(server);

  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Expected a TCP test server address');
  }

  return `http://127.0.0.1:${address.port}/v1`;
};

const textFixture: NormalizedDocumentText = {
  documentId: 'doc-1',
  extractor: 'pdfjs',
  pageCount: 1,
  pages: [
    {
      pageNumber: 1,
      text: 'Vendor Example invoice 123.45 EUR',
      charCount: 33,
    },
  ],
  totalCharCount: 33,
};

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        }),
    ),
  );
});

describe('AiSdkInvoiceParser', () => {
  it('requests schema-based structured output from OpenAI-compatible providers', async () => {
    let requestBody: Record<string, unknown> | null = null;
    const baseUrl = await listen((body) => {
      requestBody = body;
    });

    const parsed = await new AiSdkInvoiceParser({
      providerKind: 'openai-compatible',
      providerLabel: 'Test provider',
      baseUrl,
      modelId: 'test-model',
      apiKey: 'test-key',
    }).parseInvoiceDocument({
      documentId: 'doc-1',
      fileName: 'invoice.pdf',
      text: textFixture,
    });

    expect(parsed.isInvoiceLike).toBe(true);
    expect(requestBody).toEqual(
      expect.objectContaining({
        model: 'test-model',
        response_format: expect.objectContaining({
          type: 'json_schema',
          json_schema: expect.objectContaining({
            name: 'ParsedInvoiceDocument',
            strict: true,
            schema: expect.any(Object),
          }),
        }),
      }),
    );
    expect(requestBody).toEqual(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system',
            content: expect.stringContaining('amountText is the exact gross line-item subtotal'),
          }),
        ]),
      }),
    );
  });
});
