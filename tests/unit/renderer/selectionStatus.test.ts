import { describe, expect, it } from 'vitest';

import { formatSelectionStatus } from '../../../app/renderer/selectionStatus';
import type { ImportFilesResult } from '../../../app/shared/imports';

const importFilesResult = (
  result: Partial<ImportFilesResult>,
): ImportFilesResult => ({
  canceled: false,
  filePaths: [],
  accepted: [],
  skipped: [],
  failed: [],
  ...result,
});

describe('formatSelectionStatus', () => {
  it('formats the empty state', () => {
    expect(formatSelectionStatus(null)).toBe('No files selected.');
  });

  it('formats a canceled dialog result', () => {
    expect(formatSelectionStatus(importFilesResult({ canceled: true }))).toBe(
      'File selection canceled.',
    );
  });

  it('formats a single selected file', () => {
    expect(
      formatSelectionStatus(importFilesResult({ filePaths: ['/tmp/a.pdf'] })),
    ).toBe('1 file selected.');
  });

  it('formats multiple selected files', () => {
    expect(
      formatSelectionStatus(importFilesResult({
        filePaths: ['/tmp/a.pdf', '/tmp/b.pdf'],
      })),
    ).toBe('2 files selected.');
  });

  it('formats import outcomes', () => {
    expect(
      formatSelectionStatus(importFilesResult({
        accepted: [
          {
            filePath: '/tmp/a.pdf',
            documentId: 'document-1',
            originalFileName: 'a.pdf',
            storagePath: 'documents/unassigned/document-1.pdf',
            sha256: 'a'.repeat(64),
          },
        ],
        skipped: [
          {
            filePath: '/tmp/b.pdf',
            originalFileName: 'b.pdf',
            reason: 'duplicate',
            existingDocumentId: 'document-2',
          },
        ],
      })),
    ).toBe('1 accepted, 1 skipped, 0 failed.');
  });
});
