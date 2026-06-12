import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const getDocumentsDirectory = (profileDirectory: string) =>
  join(profileDirectory, 'documents');

export const ensureDocumentsDirectory = (profileDirectory: string) => {
  const documentsDirectory = getDocumentsDirectory(profileDirectory);
  mkdirSync(documentsDirectory, { recursive: true });
  return documentsDirectory;
};

export const getTaxYearDocumentDirectory = (
  profileDirectory: string,
  taxYear: number,
) => join(getDocumentsDirectory(profileDirectory), String(taxYear));
