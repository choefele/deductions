import { Link, useLoaderData } from 'react-router';
import { ArrowRight, CheckCircle2, Inbox, XCircle } from 'lucide-react';

import type { AllYearsSummary } from '../../shared/deductions';
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
              <CardDescription>Items waiting for a decision.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.pending}
            </CardContent>
          </Card>
        </Link>
        <Link to={reviewQueuePath('accepted')}>
          <Card className="h-full transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                Accepted
              </CardTitle>
              <CardDescription>Items ready to include later.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.accepted}
            </CardContent>
          </Card>
        </Link>
        <Link to={reviewQueuePath('rejected')}>
          <Card className="h-full transition-colors hover:bg-accent/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="size-4" />
                Rejected
              </CardTitle>
              <CardDescription>Items excluded from export.</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">
              {summary.counts.rejected}
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
            <CardTitle>Recent items</CardTitle>
            <CardDescription>Latest imported or reviewed items.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.recentInvoiceItems.map((invoiceItem) => (
              <Link
                key={invoiceItem.id}
                className="block rounded-md border p-3 transition-colors hover:bg-accent/40"
                to={`/invoices/${invoiceItem.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-medium">
                    {invoiceItem.vendor}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(invoiceItem.amount, invoiceItem.currency)}
                  </span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDate(invoiceItem.invoiceDate)} · {invoiceItem.taxYear}
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </main>
  );
};
