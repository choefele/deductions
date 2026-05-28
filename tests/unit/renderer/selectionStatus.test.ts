import { describe, expect, it } from 'vitest';

import { formatSelectionStatus } from '../../../app/renderer/selectionStatus';

describe('formatSelectionStatus', () => {
  it('formats the empty state', () => {
    expect(formatSelectionStatus(null)).toBe('No files selected.');
  });

  it('formats a canceled dialog result', () => {
    expect(formatSelectionStatus({ canceled: true, filePaths: [] })).toBe(
      'File selection canceled.',
    );
  });

  it('formats a single selected file', () => {
    expect(formatSelectionStatus({ canceled: false, filePaths: ['/tmp/a.pdf'] })).toBe(
      '1 file selected.',
    );
  });

  it('formats multiple selected files', () => {
    expect(
      formatSelectionStatus({
        canceled: false,
        filePaths: ['/tmp/a.pdf', '/tmp/b.pdf'],
      }),
    ).toBe('2 files selected.');
  });
});
