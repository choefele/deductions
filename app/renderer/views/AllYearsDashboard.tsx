import { useLoaderData } from 'react-router';

import type { AllYearsSummary } from '../../shared/data';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  MoneySummaryCard,
  YearDashboardRow,
} from '@/components/DashboardSummary';

export const AllYearsDashboard = () => {
  const summary = useLoaderData() as AllYearsSummary;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All years
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See accepted totals and what needs review.
          </p>
        </div>
        <Badge variant="outline">{summary.years.length} tax years</Badge>
      </div>

      {summary.years.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No invoice items yet</CardTitle>
            <CardDescription>
              Import and process a document to start building your tax-year
              summary.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <>
          <section aria-label="Money summary">
            <MoneySummaryCard
              amounts={summary.amounts}
              counts={summary.counts}
            />
          </section>

          <section aria-labelledby="tax-years-heading">
            <div className="mb-3">
              <h2 id="tax-years-heading" className="text-lg font-semibold">
                By tax year
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Open a status to work through items for that year.
              </p>
            </div>
            <div className="space-y-3">
              {summary.years.map((year) => (
                <YearDashboardRow
                  key={year.year}
                  amounts={year.amounts}
                  counts={year.counts}
                  year={year.year}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
};
