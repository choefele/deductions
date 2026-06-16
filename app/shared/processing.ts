export type ProcessDocumentResult = {
  enqueued: boolean;
  documentId: string;
};

export type DeductionsProcessingApi = {
  processDocument: (documentId: string) => Promise<ProcessDocumentResult>;
  onDocumentsChanged: (listener: () => void) => () => void;
};
