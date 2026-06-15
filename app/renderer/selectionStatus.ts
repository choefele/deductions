import type { ImportFilesResult } from '../shared/imports';

export const formatSelectionStatus = (result: ImportFilesResult | null): string => {
  if (!result) {
    return 'No files selected.';
  }

  if (result.canceled) {
    return 'File selection canceled.';
  }

  const outcomeCount =
    result.accepted.length + result.skipped.length + result.failed.length;

  if (outcomeCount > 0) {
    return [
      `${result.accepted.length} accepted`,
      `${result.skipped.length} skipped`,
      `${result.failed.length} failed`,
    ].join(', ') + '.';
  }

  const count = result.filePaths.length;
  return count === 1 ? '1 file selected.' : `${count} files selected.`;
};
