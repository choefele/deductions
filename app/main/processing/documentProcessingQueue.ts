import { eq } from 'drizzle-orm';

import { documents } from '../data/schema';
import type { DeductionsDatabase } from '../data/types';
import {
  documentProcessorVersion,
  processStoredDocument,
} from './documentProcessor';
import type { DocumentTextExtractor, InvoiceAiParser } from './types';

export type DocumentProcessingQueueOptions = {
  db: DeductionsDatabase;
  profileDirectory: string;
  extractor: DocumentTextExtractor;
  parser: InvoiceAiParser;
  onDocumentsChanged?: () => void;
};

export class DocumentProcessingQueue {
  private readonly enqueuedDocumentIds = new Set<string>();
  private isDraining = false;

  constructor(private readonly options: DocumentProcessingQueueOptions) {}

  recoverInterruptedDocuments(now = Date.now()) {
    this.options.db
      .update(documents)
      .set({
        status: 'imported',
        processingCompletedAt: null,
        processingError: 'Processing was interrupted. Process the document again.',
        processorVersion: documentProcessorVersion,
        updatedAt: now,
      })
      .where(eq(documents.status, 'processing'))
      .run();
  }

  enqueue(documentId: string) {
    if (this.enqueuedDocumentIds.has(documentId)) {
      return false;
    }

    this.enqueuedDocumentIds.add(documentId);
    void this.drain();

    return true;
  }

  private async drain() {
    if (this.isDraining) {
      return;
    }

    this.isDraining = true;

    try {
      while (this.enqueuedDocumentIds.size > 0) {
        const [documentId] = this.enqueuedDocumentIds;
        this.enqueuedDocumentIds.delete(documentId);

        await processStoredDocument({
          db: this.options.db,
          profileDirectory: this.options.profileDirectory,
          documentId,
          extractor: this.options.extractor,
          parser: this.options.parser,
        });
        this.options.onDocumentsChanged?.();
      }
    } finally {
      this.isDraining = false;
    }
  }
}
