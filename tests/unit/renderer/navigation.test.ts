import { describe, expect, it } from 'vitest';

import {
  categoryPath,
  getBreadcrumbs,
  getSelectionForPath,
  invoicePath,
  reviewQueuePath,
  taxYearPath,
} from '../../../app/renderer/navigation';
import type { TaxYearSummary } from '../../../app/renderer/data/deductionRepository';

describe('navigation helpers', () => {
  it('generates stable app paths', () => {
    expect(taxYearPath(2025)).toBe('/years/2025');
    expect(categoryPath(2025, 'work-related-expenses')).toBe(
      '/years/2025/categories/work-related-expenses',
    );
    expect(invoicePath('inv-1')).toBe('/invoices/inv-1');
    expect(reviewQueuePath('pending')).toBe('/review/pending');
  });

  it('derives breadcrumbs for category views', () => {
    expect(
      getBreadcrumbs({
        type: 'category',
        year: 2025,
        categoryId: 'work-related-expenses',
      }),
    ).toEqual([
      { label: 'Deductions', to: '/' },
      { label: '2025', to: '/years/2025' },
      { label: 'Work-related expenses' },
    ]);
  });

  it('maps paths back to selections for active sidebar state', () => {
    const years = [{ year: 2025 }] as TaxYearSummary[];

    expect(getSelectionForPath('/years/2025', years)).toEqual({
      type: 'tax-year',
      year: 2025,
    });
    expect(getSelectionForPath('/review/low-confidence', years)).toEqual({
      type: 'review-queue',
      queue: 'low-confidence',
    });
  });
});
