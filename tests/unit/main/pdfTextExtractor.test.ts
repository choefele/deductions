import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { PdfJsDocumentTextExtractor } from '../../../app/main/processing/pdfTextExtractor';

const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-pdf-test-'));
  tempDirectories.push(directory);
  return directory;
};

const pdfString = (text: string) => {
  const escapedText = text.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    [
      '3 0 obj\n',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ',
      '/Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\n',
      'endobj\n',
    ].join(''),
    [
      '4 0 obj\n',
      `<< /Length ${escapedText.length + 37} >>\n`,
      'stream\n',
      `BT /F1 12 Tf 72 720 Td (${escapedText}) Tj ET\n`,
      'endstream\n',
      'endobj\n',
    ].join(''),
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(body.length);
    body += object;
  });

  const xrefOffset = body.length;
  const xrefRows = offsets
    .map((offset, index) =>
      index === 0
        ? '0000000000 65535 f \n'
        : `${String(offset).padStart(10, '0')} 00000 n \n`,
    )
    .join('');

  return [
    body,
    `xref\n0 ${objects.length + 1}\n`,
    xrefRows,
    'trailer\n',
    `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`,
    'startxref\n',
    `${xrefOffset}\n`,
    '%%EOF\n',
  ].join('');
};

afterEach(() => {
  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('PdfJsDocumentTextExtractor', () => {
  it('extracts a normalized text shape from a PDF file', async () => {
    const directory = createTempDirectory();
    const filePath = join(directory, 'invoice.pdf');
    writeFileSync(filePath, pdfString('Vendor Example Invoice 2025'));

    const text = await new PdfJsDocumentTextExtractor().extractText({
      documentId: 'doc-1',
      filePath,
    });

    expect(text).toEqual({
      documentId: 'doc-1',
      extractor: 'pdfjs',
      pageCount: 1,
      pages: [
        expect.objectContaining({
          pageNumber: 1,
          text: 'Vendor Example Invoice 2025',
          charCount: 27,
        }),
      ],
      totalCharCount: 27,
    });
  });
});
