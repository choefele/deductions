import { describe, expect, it } from 'vitest';

import { mockDeductionRepository } from '../../../app/renderer/data/mockDeductionRepository';

describe('mockDeductionRepository', () => {
  it('summarizes all tax years', async () => {
    const summary = await mockDeductionRepository.getAllYearsSummary();

    expect(summary.years.map((year) => year.year)).toEqual([2025, 2024]);
    expect(summary.counts.pending).toBeGreaterThan(0);
    expect(summary.counts.consultantReview).toBeGreaterThan(0);
  });

  it('filters invoices by category', async () => {
    const invoices = await mockDeductionRepository.listInvoicesByCategory(
      2025,
      'work-related-expenses',
    );

    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices.every((invoice) => invoice.taxYear === 2025)).toBe(true);
    expect(
      invoices.every(
        (invoice) => invoice.categoryId === 'work-related-expenses',
      ),
    ).toBe(true);
  });

  it('filters review queues from status and derived confidence', async () => {
    const pending = await mockDeductionRepository.listReviewQueueInvoices('pending');
    const lowConfidence =
      await mockDeductionRepository.listReviewQueueInvoices('low-confidence');

    expect(pending.every((invoice) => invoice.status === 'pending')).toBe(true);
    expect(
      lowConfidence.every((invoice) => invoice.confidence === 'low'),
    ).toBe(true);
  });
});
