import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  initializeDeductionsDatabase,
  type DeductionsDatabaseHandle,
} from '../../../app/main/data/database';
import { DocumentPreviewOpener } from '../../../app/main/documents/documentPreviewOpener';

const handles: DeductionsDatabaseHandle[] = [];
const tempDirectories: string[] = [];

const createTempDirectory = () => {
  const directory = mkdtempSync(join(tmpdir(), 'deductions-preview-test-'));
  tempDirectories.push(directory);
  return directory;
};

const openDatabase = () => {
  const handle = initializeDeductionsDatabase({
    appDataDirectory: createTempDirectory(),
    seedDevelopment: true,
    now: new Date('2026-01-15T12:00:00.000Z'),
  });
  handles.push(handle);
  return handle;
};

afterEach(() => {
  while (handles.length > 0) {
    handles.pop()?.close();
  }

  while (tempDirectories.length > 0) {
    rmSync(tempDirectories.pop() ?? '', { recursive: true, force: true });
  }
});

describe('DocumentPreviewOpener', () => {
  it('opens a temporary copy instead of the private stored document', async () => {
    const handle = openDatabase();
    const item = (
      await handle.data.listInvoiceItemsByReviewStatus('pending')
    ).find((invoiceItem) => invoiceItem.vendor === 'Apple Store');
    const detail = await handle.data.getInvoiceItemById(item?.id ?? '');
    const document = detail?.document;

    expect(document).toBeDefined();

    const storedDocumentPath = join(
      handle.profileDirectory,
      ...(document?.storagePath.split('/') ?? []),
    );
    mkdirSync(join(storedDocumentPath, '..'), { recursive: true });
    writeFileSync(storedDocumentPath, 'private pdf copy');

    const openPath = vi.fn().mockResolvedValue('');
    const opener = new DocumentPreviewOpener(
      handle.db,
      handle.profileDirectory,
      createTempDirectory(),
      openPath,
    );

    const result = await opener.openDocumentPreview(document?.id ?? '');

    expect(result.opened).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.filePath).not.toBe(storedDocumentPath);
    expect(relative(handle.profileDirectory, result.filePath ?? '')).toMatch(
      /^\.\./,
    );
    expect(readFileSync(result.filePath ?? '', 'utf8')).toBe('private pdf copy');
    expect(readFileSync(storedDocumentPath, 'utf8')).toBe('private pdf copy');
    expect(openPath).toHaveBeenCalledWith(result.filePath);
  });

  it('returns a failure when the document does not exist', async () => {
    const handle = openDatabase();
    const openPath = vi.fn().mockResolvedValue('');
    const opener = new DocumentPreviewOpener(
      handle.db,
      handle.profileDirectory,
      createTempDirectory(),
      openPath,
    );

    const result = await opener.openDocumentPreview('missing-document');

    expect(result).toEqual({
      opened: false,
      message: 'Document not found.',
    });
    expect(openPath).not.toHaveBeenCalled();
  });

  it('returns a failure when the stored file is missing', async () => {
    const handle = openDatabase();
    const item = (
      await handle.data.listInvoiceItemsByReviewStatus('pending')
    ).find((invoiceItem) => invoiceItem.vendor === 'Apple Store');
    const detail = await handle.data.getInvoiceItemById(item?.id ?? '');
    const openPath = vi.fn().mockResolvedValue('');
    const opener = new DocumentPreviewOpener(
      handle.db,
      handle.profileDirectory,
      createTempDirectory(),
      openPath,
    );

    const result = await opener.openDocumentPreview(detail?.document?.id ?? '');

    expect(result.opened).toBe(false);
    expect(result.message).toBeDefined();
    expect(openPath).not.toHaveBeenCalled();
    expect(result.filePath ? existsSync(result.filePath) : false).toBe(false);
  });
});
