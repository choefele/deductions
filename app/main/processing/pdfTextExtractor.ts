import { readFile } from 'node:fs/promises';

import type { DocumentTextExtractor, NormalizedDocumentText } from './types';

type PdfJsModule = typeof import('pdfjs-dist/legacy/build/pdf.mjs');

const pdfjsVersion = '6.0.227';

// PDF.js creates a DOMMatrix while evaluating its display code, even when only
// extracting text. The Electron main process has no DOM APIs, and the Vite
// package intentionally excludes PDF.js's optional native canvas dependency.
const installDomMatrixFallback = () => {
  if ('DOMMatrix' in globalThis) {
    return;
  }

  class DOMMatrixFallback {
    readonly values: number[] | string | undefined;

    constructor(init?: number[] | string) {
      this.values = init;
    }
  }

  Object.assign(globalThis, { DOMMatrix: DOMMatrixFallback });
};

let pdfjsModulePromise: Promise<PdfJsModule> | null = null;

const loadPdfJs = () => {
  installDomMatrixFallback();
  pdfjsModulePromise ??= import('pdfjs-dist/legacy/build/pdf.mjs');
  return pdfjsModulePromise;
};

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
    const { getDocument } = await loadPdfJs();
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
