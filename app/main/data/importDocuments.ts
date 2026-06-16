import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { basename, extname, join, posix } from 'node:path';

import { eq } from 'drizzle-orm';

import type { ImportFilesResult } from '../../shared/imports';
import { getUnassignedDocumentDirectory } from './documentStorage';
import { documents } from './schema';
import type { DeductionsDatabase } from './types';

export type ImportDocumentsOptions = {
  db: DeductionsDatabase;
  profileDirectory: string;
  sourceId: string;
  filePaths: string[];
  now?: Date;
};

export type ImportDocumentsResult = Pick<
  ImportFilesResult,
  'accepted' | 'skipped' | 'failed'
>;

const knownMimeTypes: Record<string, string> = {
  '.pdf': 'application/pdf',
};

const supportedExtensions = new Set(Object.keys(knownMimeTypes));

const extensionFor = (filePath: string) => extname(filePath).toLowerCase();

const mimeTypeFor = (filePath: string) =>
  knownMimeTypes[extensionFor(filePath)] ?? 'application/octet-stream';

const sha256File = async (filePath: string) => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);

  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });

  return hash.digest('hex');
};

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Unknown import error';

const destinationFor = (documentId: string, filePath: string) => {
  const extension = extensionFor(filePath) || '.bin';
  return posix.join('documents', 'unassigned', `${documentId}${extension}`);
};

export const importDocuments = async ({
  db,
  profileDirectory,
  sourceId,
  filePaths,
  now = new Date(),
}: ImportDocumentsOptions): Promise<ImportDocumentsResult> => {
  const result: ImportDocumentsResult = {
    accepted: [],
    skipped: [],
    failed: [],
  };
  const importedAt = now.getTime();

  for (const filePath of filePaths) {
    const originalFileName = basename(filePath);

    try {
      if (!supportedExtensions.has(extensionFor(filePath))) {
        result.failed.push({
          filePath,
          originalFileName,
          reason: 'Unsupported file type. Import PDF files.',
        });
        continue;
      }

      const fileStat = await stat(filePath);

      if (!fileStat.isFile()) {
        result.failed.push({
          filePath,
          originalFileName,
          reason: 'Selected path is not a file.',
        });
        continue;
      }

      const sha256 = await sha256File(filePath);
      const existing = db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.sha256, sha256))
        .limit(1)
        .get();

      if (existing) {
        result.skipped.push({
          filePath,
          originalFileName,
          reason: 'duplicate',
          existingDocumentId: existing.id,
        });
        continue;
      }

      const documentId = randomUUID();
      const storagePath = destinationFor(documentId, filePath);
      const destinationPath = join(profileDirectory, ...storagePath.split('/'));

      await mkdir(getUnassignedDocumentDirectory(profileDirectory), {
        recursive: true,
      });
      await copyFile(filePath, destinationPath);

      try {
        db.insert(documents)
          .values({
            id: documentId,
            sourceId,
            originalFileName,
            storagePath,
            mimeType: mimeTypeFor(filePath),
            sha256,
            status: 'imported',
            importedAt,
            createdAt: importedAt,
            updatedAt: importedAt,
          })
          .run();
      } catch (error) {
        await unlink(destinationPath).catch(() => undefined);

        throw error;
      }

      result.accepted.push({
        filePath,
        documentId,
        originalFileName,
        storagePath,
        sha256,
      });
    } catch (error) {
      result.failed.push({
        filePath,
        originalFileName,
        reason: errorMessage(error),
      });
    }
  }

  return result;
};
