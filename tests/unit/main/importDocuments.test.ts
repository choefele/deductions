import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from '../../../app/main/data/database';
import { importDocuments } from '../../../app/main/data/importDocuments';
import { documents } from '../../../app/main/data/schema';

const handles: DeductionsDatabaseHandle[] = [];
const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-import-test-'));
  tempDirectories.push(directory);
  return directory;
};

const openDatabase = () => {
  const handle = initializeDeductionsDatabase({
    appDataDirectory: createTempDirectory(),
    seedDevelopment: false,
    now: new Date('2026-01-15T12:00:00.000Z'),
  });
  handles.push(handle);
  return handle;
};

const importFile = (
  handle: DeductionsDatabaseHandle,
  filePaths: string[],
) =>
  importDocuments({
    db: handle.db,
    profileDirectory: handle.profileDirectory,
    sourceId: handle.manualUploadSourceId,
    filePaths,
    now: new Date('2026-02-20T10:00:00.000Z'),
  });

afterEach(() => {
  while (handles.length > 0) {
    handles.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('importDocuments', () => {
  it('copies selected files into profile storage and inserts document rows', async () => {
    const handle = openDatabase();
    const inputDirectory = createTempDirectory();
    const inputPath = join(inputDirectory, 'invoice.pdf');
    writeFileSync(inputPath, 'invoice body');

    const result = await importFile(handle, [inputPath]);

    expect(result).toMatchObject({
      accepted: [
        {
          filePath: inputPath,
          originalFileName: 'invoice.pdf',
          storagePath: expect.stringMatching(
            /^documents\/unassigned\/.+\.pdf$/,
          ),
        },
      ],
      skipped: [],
      failed: [],
    });

    const accepted = result.accepted[0];
    const storedPath = join(
      handle.profileDirectory,
      ...accepted.storagePath.split('/'),
    );
    const row = handle.db
      .select()
      .from(documents)
      .where(eq(documents.id, accepted.documentId))
      .limit(1)
      .get();

    expect(existsSync(storedPath)).toBe(true);
    expect(readFileSync(storedPath, 'utf8')).toBe('invoice body');
    expect(row).toMatchObject({
      sourceId: handle.manualUploadSourceId,
      originalFileName: 'invoice.pdf',
      storagePath: accepted.storagePath,
      mimeType: 'application/pdf',
      sha256: accepted.sha256,
      status: 'imported',
      importedAt: Date.parse('2026-02-20T10:00:00.000Z'),
    });
    await expect(handle.data.listTaxYears()).resolves.toEqual([]);
    await expect(handle.data.listSources()).resolves.toEqual([
      expect.objectContaining({
        documentCount: 1,
        invoiceCount: 0,
        invoiceItemCount: 0,
      }),
    ]);
  });

  it('skips duplicate documents by content hash', async () => {
    const handle = openDatabase();
    const inputDirectory = createTempDirectory();
    const inputPath = join(inputDirectory, 'duplicate.pdf');
    writeFileSync(inputPath, 'same invoice body');
    const first = await importFile(handle, [inputPath]);

    const second = await importFile(handle, [inputPath]);

    expect(second).toEqual({
      accepted: [],
      skipped: [
        {
          filePath: inputPath,
          originalFileName: 'duplicate.pdf',
          reason: 'duplicate',
          existingDocumentId: first.accepted[0].documentId,
        },
      ],
      failed: [],
    });

    const rows = handle.db.select().from(documents).all();
    expect(rows).toHaveLength(1);
  });

  it('reports per-file failures without aborting the batch', async () => {
    const handle = openDatabase();
    const inputDirectory = createTempDirectory();
    const inputPath = join(inputDirectory, 'ok.pdf');
    const missingPath = join(inputDirectory, 'missing.pdf');
    writeFileSync(inputPath, 'invoice body');

    const result = await importFile(handle, [missingPath, inputPath]);

    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0]).toEqual(
      expect.objectContaining({
        filePath: inputPath,
        originalFileName: 'ok.pdf',
      }),
    );
    expect(result.failed).toEqual([
      expect.objectContaining({
        filePath: missingPath,
        originalFileName: 'missing.pdf',
      }),
    ]);
  });

  it('rejects unsupported file types before copying them', async () => {
    const handle = openDatabase();
    const inputDirectory = createTempDirectory();
    const inputPath = join(inputDirectory, 'receipt.png');
    writeFileSync(inputPath, 'image body');

    const result = await importFile(handle, [inputPath]);

    expect(result).toEqual({
      accepted: [],
      skipped: [],
      failed: [
        {
          filePath: inputPath,
          originalFileName: 'receipt.png',
          reason: 'Unsupported file type. Import PDF files.',
        },
      ],
    });
    expect(handle.db.select().from(documents).all()).toHaveLength(0);
  });
});
