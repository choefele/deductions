import { useLoaderData } from 'react-router';

import type { TaxYearSummary } from '../../shared/data';
import {
  MoneySummaryCard,
  StatusSummaryCards,
} from '@/components/DashboardSummary';

export const TaxYearDashboard = () => {
  const summary = useLoaderData() as TaxYearSummary;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {summary.year} overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See what is ready now and what still needs a decision.
          </p>
        </div>
      </div>

      <section aria-label="Money summary">
        <MoneySummaryCard amounts={summary.amounts} counts={summary.counts} />
      </section>

      <section aria-labelledby="items-by-status-heading">
        <h2 id="items-by-status-heading" className="mb-3 text-lg font-semibold">
          Items by status
        </h2>
        <StatusSummaryCards counts={summary.counts} year={summary.year} />
      </section>
    </main>
  );
};
