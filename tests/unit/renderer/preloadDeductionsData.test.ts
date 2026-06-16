import { afterEach, describe, expect, it, vi } from 'vitest';

import { preloadDeductionsData } from '../../../app/renderer/data/preloadDeductionsData';
import type { DeductionsBridgeApi } from '../../../app/shared/ipc';

const createWindowApi = (): DeductionsBridgeApi => ({
  appInfo: {
    platform: 'darwin',
    version: '42.0.0',
  },
  imports: {
    importFiles: vi.fn(),
    importFilePaths: vi.fn(),
    getPathForFile: vi.fn(),
    onImportCompleted: vi.fn(),
  },
  data: {
    listCategories: vi.fn().mockResolvedValue([]),
    getAllYearsSummary: vi.fn().mockResolvedValue({
      years: [],
      counts: { pending: 0, accepted: 0, rejected: 0 },
      recentInvoiceItems: [],
    }),
    listTaxYears: vi.fn().mockResolvedValue([]),
    getTaxYearSummary: vi.fn().mockResolvedValue(null),
    listInvoiceItemsByCategory: vi.fn().mockResolvedValue([]),
    listInvoiceItemsByReviewStatus: vi.fn().mockResolvedValue([]),
    getInvoiceItemById: vi.fn().mockResolvedValue(null),
    getInvoiceById: vi.fn().mockResolvedValue(null),
    listDocumentSummaries: vi.fn().mockResolvedValue([]),
    getDocumentDetail: vi.fn().mockResolvedValue(null),
    listSources: vi.fn().mockResolvedValue([]),
  },
  processing: {
    processDocument: vi.fn(),
    onDocumentsChanged: vi.fn(),
  },
});

describe('preloadDeductionsData', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('forwards read calls to the preload data API', async () => {
    const api = createWindowApi();
    vi.stubGlobal('window', { deductions: api });

    await preloadDeductionsData.getTaxYearSummary(2025);
    await preloadDeductionsData.listInvoiceItemsByCategory(
      2025,
      'work-related-expenses',
    );
    await preloadDeductionsData.listInvoiceItemsByReviewStatus('pending');
    await preloadDeductionsData.getInvoiceItemById('item-1');
    await preloadDeductionsData.listDocumentSummaries();
    await preloadDeductionsData.getDocumentDetail('doc-1');

    expect(api.data.getTaxYearSummary).toHaveBeenCalledWith(2025);
    expect(api.data.listInvoiceItemsByCategory).toHaveBeenCalledWith(
      2025,
      'work-related-expenses',
    );
    expect(api.data.listInvoiceItemsByReviewStatus).toHaveBeenCalledWith(
      'pending',
    );
    expect(api.data.getInvoiceItemById).toHaveBeenCalledWith('item-1');
    expect(api.data.listDocumentSummaries).toHaveBeenCalledWith();
    expect(api.data.getDocumentDetail).toHaveBeenCalledWith('doc-1');
  });
});
