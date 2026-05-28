import type { OpenFilesResult } from '../shared/ipc';

export const formatSelectionStatus = (result: OpenFilesResult | null): string => {
  if (!result) {
    return 'No files selected.';
  }

  if (result.canceled) {
    return 'File selection canceled.';
  }

  const count = result.filePaths.length;
  return count === 1 ? '1 file selected.' : `${count} files selected.`;
};
