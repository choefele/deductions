import { Link, useLoaderData } from 'react-router';
import { ArrowRight, FileWarning, Inbox, TriangleAlert } from 'lucide-react';

import type { AllYearsSummary } from '@/data/deductionRepository';
import { reviewQueuePath, taxYearPath } from '@/navigation';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { countCards, formatCurrency, formatDate } from './viewUtils';

export const AllYearsDashboard = () => {
  const summary = useLoaderData() as AllYearsSummary;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            All-years dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review open todos and jump into a tax year when you are ready to work.
          </p>
        </div>
        <Badge variant="outline">{summary.years.length} tax years</Badge>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Link to={reviewQueuePath('pending')}>
          <Card className="h-full transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="size-4" />
                Pending review
              </CardTitle>
              <CardDescription>Documents waiting for a decision.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.pending}
            </CardContent>
          </Card>
        </Link>
        <Link to={reviewQueuePath('low-confidence')}>
          <Card className="h-full transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TriangleAlert className="size-4" />
                Low confidence
              </CardTitle>
              <CardDescription>Items where extraction needs attention.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.lowConfidence}
            </CardContent>
          </Card>
        </Link>
        <Link to={reviewQueuePath('export-issues')}>
          <Card className="h-full transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileWarning className="size-4" />
                Export issues
              </CardTitle>
              <CardDescription>Accepted items missing export evidence.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.exportIssues}
            </CardContent>
          </Card>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_24rem]">
        <Card>
          <CardHeader>
            <CardTitle>Tax years</CardTitle>
            <CardDescription>Current collection state by year.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.years.map((year) => (
              <Link
                key={year.year}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent/40"
                to={taxYearPath(year.year)}
              >
                <div>
                  <div className="font-medium">{year.year}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {countCards(year.counts).map((item) => (
                      <span key={item.label}>
                        {item.label}: {item.value}
                      </span>
                    ))}
                  </div>
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent invoices</CardTitle>
            <CardDescription>Latest imported or reviewed documents.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.recentInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                className="block rounded-md border p-3 transition-colors hover:bg-accent/40"
                to={`/invoices/${invoice.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {invoice.vendor}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(invoice.date)} · {invoice.taxYear}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};
