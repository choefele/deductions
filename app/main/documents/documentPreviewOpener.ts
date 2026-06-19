import { copyFile, mkdtemp } from 'node:fs/promises';
import { basename, isAbsolute, join, relative, resolve } from 'node:path';

import { eq } from 'drizzle-orm';
import { shell } from 'electron';

import type { OpenDocumentPreviewResult } from '../../shared/documents';
import { documents } from '../data/schema';
import type { DeductionsDatabase } from '../data/types';

export type OpenPath = (path: string) => Promise<string>;

const sanitizeFileName = (fileName: string) => {
  const sanitized = basename(fileName).replace(/[^A-Za-z0-9._-]+/g, '_');

  return sanitized.length > 0 && sanitized !== '.' && sanitized !== '..'
    ? sanitized
    : 'document.pdf';
};

const resolveStoredDocumentPath = (
  profileDirectory: string,
  storagePath: string,
) => {
  const profileRoot = resolve(profileDirectory);
  const absolutePath = resolve(profileRoot, ...storagePath.split('/'));
  const pathRelativeToProfile = relative(profileRoot, absolutePath);

  if (
    pathRelativeToProfile.length === 0 ||
    pathRelativeToProfile.startsWith('..') ||
    isAbsolute(pathRelativeToProfile)
  ) {
    return null;
  }

  return absolutePath;
};

export class DocumentPreviewOpener {
  constructor(
    private readonly db: DeductionsDatabase,
    private readonly profileDirectory: string,
    private readonly tempDirectory: string,
    private readonly openPath: OpenPath = shell.openPath,
  ) {}

  async openDocumentPreview(
    documentId: string,
  ): Promise<OpenDocumentPreviewResult> {
    if (documentId.trim().length === 0) {
      return {
        opened: false,
        message: 'Document id is required.',
      };
    }

    const document = this.db
      .select({
        originalFileName: documents.originalFileName,
        storagePath: documents.storagePath,
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1)
      .get();

    if (!document) {
      return {
        opened: false,
        message: 'Document not found.',
      };
    }

    const sourcePath = resolveStoredDocumentPath(
      this.profileDirectory,
      document.storagePath,
    );

    if (!sourcePath) {
      return {
        opened: false,
        message: 'Stored document path is invalid.',
      };
    }

    const previewDirectory = await mkdtemp(
      join(this.tempDirectory, 'deductions-preview-'),
    );
    const previewPath = join(
      previewDirectory,
      sanitizeFileName(document.originalFileName),
    );

    try {
      await copyFile(sourcePath, previewPath);
      const openError = await this.openPath(previewPath);

      if (openError) {
        return {
          opened: false,
          filePath: previewPath,
          message: openError,
        };
      }

      return {
        opened: true,
        filePath: previewPath,
      };
    } catch (error) {
      return {
        opened: false,
        filePath: previewPath,
        message:
          error instanceof Error
            ? error.message
            : 'Document preview could not be opened.',
      };
    }
  }
}
