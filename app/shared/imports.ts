export type ImportFilesResult = {
  canceled: boolean;
  filePaths: string[];
  accepted: Array<{
    filePath: string;
    documentId: string;
    originalFileName: string;
    storagePath: string;
    sha256: string;
  }>;
  skipped: Array<{
    filePath: string;
    originalFileName: string;
    reason: 'duplicate';
    existingDocumentId: string;
  }>;
  failed: Array<{
    filePath: string;
    originalFileName: string;
    reason: string;
  }>;
};

export type DeductionsImportsApi = {
  importFiles: () => Promise<ImportFilesResult>;
};
