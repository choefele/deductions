import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import {
  getDocument,
  GlobalWorkerOptions,
  version as pdfjsVersion,
} from 'pdfjs-dist/legacy/build/pdf.mjs';

import type { DocumentTextExtractor, NormalizedDocumentText } from './types';

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
).href;

const normalizeFragment = (value: string) =>
  value.replace(/\s+/g, ' ').trim();

const normalizePageText = (items: unknown[]) =>
  items
    .map((item) => {
      if (
        typeof item === 'object' &&
        item !== null &&
        'str' in item &&
        typeof item.str === 'string'
      ) {
        return normalizeFragment(item.str);
      }

      return '';
    })
    .filter((text) => text.length > 0)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

export class PdfJsDocumentTextExtractor implements DocumentTextExtractor {
  readonly extractorVersion = `pdfjs-${pdfjsVersion}`;

  async extractText({
    documentId,
    filePath,
  }: {
    documentId: string;
    filePath: string;
  }): Promise<NormalizedDocumentText> {
    const bytes = await readFile(filePath);
    const loadingTask = getDocument({
      data: new Uint8Array(bytes),
      disableWorker: true,
      isEvalSupported: false,
      useSystemFonts: true,
      useWorkerFetch: false,
    });

    try {
      const pdf = await loadingTask.promise;
      const pages: NormalizedDocumentText['pages'] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const text = normalizePageText(content.items);

        pages.push({
          pageNumber,
          text,
          charCount: text.length,
        });
      }

      return {
        documentId,
        extractor: 'pdfjs',
        pageCount: pages.length,
        pages,
        totalCharCount: pages.reduce((total, page) => total + page.charCount, 0),
      };
    } finally {
      await loadingTask.destroy().catch(() => undefined);
    }
  }
}
