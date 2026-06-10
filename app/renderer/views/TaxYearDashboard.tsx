import { Link, useLoaderData } from 'react-router';
import { ArrowRight, Download } from 'lucide-react';

import type { TaxYearSummary } from '@/data/deductionRepository';
import { categoryPath, reviewQueuePath } from '@/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { countCards } from './viewUtils';

export const TaxYearDashboard = () => {
  const summary = useLoaderData() as TaxYearSummary;

  return (
    <main className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {summary.year} dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Check review progress, category coverage, and export readiness.
          </p>
        </div>
        <Button variant="outline" disabled>
          <Download />
          Export
        </Button>
      </div>

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {countCards(summary.counts).map((item) => (
          <Card key={item.label}>
            <CardHeader className="p-4 pb-2">
              <CardDescription>{item.label}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-2xl font-semibold">
              {item.value}
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>
            Open a category to review its invoices in the main panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {summary.categories.map(({ category, total, counts }) => (
            <Link
              key={category.id}
              className="rounded-lg border p-4 transition-colors hover:bg-accent/40"
              to={categoryPath(summary.year, category.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{category.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {category.description}
                  </p>
                </div>
                <Badge variant="secondary">{total}</Badge>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>Pending {counts.pending}</span>
                <span>Accepted {counts.accepted}</span>
                <span>Rejected {counts.rejected}</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next actions</CardTitle>
          <CardDescription>Resolve active todos before exporting.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to={reviewQueuePath('pending')}>
              Review pending
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={reviewQueuePath('export-issues')}>
              Check export issues
              <ArrowRight />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
