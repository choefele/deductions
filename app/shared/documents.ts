export type OpenDocumentPreviewResult = {
  opened: boolean;
  filePath?: string;
  message?: string;
};

export type DeductionsDocumentsApi = {
  openDocumentPreview(documentId: string): Promise<OpenDocumentPreviewResult>;
};
