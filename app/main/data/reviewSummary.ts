import { sql, type SQL } from 'drizzle-orm';

import type {
  AmountSummary,
  CountSummary,
  ReviewStatus,
} from '../../shared/data';
import { invoiceItems } from './schema';
import type { DeductionsDatabase } from './types';

type ReviewSummaryRow = {
  reviewStatus: ReviewStatus;
  count: number;
  amountCents: number;
};

export type ReviewSummary = {
  counts: CountSummary;
  amounts: AmountSummary;
};

const emptyReviewSummary = (): ReviewSummary => ({
  counts: {
    pending: 0,
    accepted: 0,
    rejected: 0,
  },
  amounts: {
    pending: 0,
    accepted: 0,
  },
});

export const getReviewSummary = (
  db: DeductionsDatabase,
  where?: SQL,
): ReviewSummary => {
  const summary = emptyReviewSummary();
  const rows = db
    .select({
      reviewStatus: invoiceItems.reviewStatus,
      count: sql<number>`count(*)`,
      amountCents: sql<number>`coalesce(sum(${invoiceItems.amountCents}), 0)`,
    })
    .from(invoiceItems)
    .where(where)
    .groupBy(invoiceItems.reviewStatus)
    .all() as ReviewSummaryRow[];

  rows.forEach((row) => {
    summary.counts[row.reviewStatus] = row.count;

    if (row.reviewStatus !== 'rejected') {
      summary.amounts[row.reviewStatus] = row.amountCents / 100;
    }
  });

  return summary;
};
