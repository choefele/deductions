import { Link, useLoaderData } from 'react-router';

import type { Invoice } from '@/data/deductionRepository';
import { categoryPath, categoryLabel } from '@/navigation';
import { ConfidenceBadge, FlagBadge, StatusBadge } from '@/components/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatDate } from './viewUtils';

export const InvoiceDetailView = () => {
  const invoice = useLoaderData() as Invoice;

  return (
    <main className="grid min-h-[calc(100vh-3.5rem)] gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section className="flex min-h-[32rem] flex-col rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <h1 className="text-lg font-semibold">{invoice.vendor}</h1>
            <p className="text-sm text-muted-foreground">
              Source document placeholder
            </p>
          </div>
          <Badge variant="outline">PDF preview later</Badge>
        </div>
        <div className="grid flex-1 place-items-center p-8 text-center">
          <div>
            <div className="mx-auto grid aspect-[3/4] w-72 place-items-center rounded-lg border bg-background shadow-sm">
              <div>
                <div className="text-sm font-medium">Invoice document</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Real PDF/image rendering is deferred.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>
              Extracted facts and review decision for this invoice.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={invoice.status} />
              <ConfidenceBadge confidence={invoice.confidence} />
              {invoice.flags.map((flag) => (
                <FlagBadge key={flag} flag={flag} />
              ))}
            </div>
            <Separator />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Vendor</dt>
                <dd className="text-right font-medium">{invoice.vendor}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right">{formatDate(invoice.date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="text-right font-medium">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Invoice no.</dt>
                <dd className="text-right">{invoice.invoiceNumber ?? 'Unknown'}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right">
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to={categoryPath(invoice.taxYear, invoice.categoryId)}
                  >
                    {categoryLabel(invoice.categoryId)}
                  </Link>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suggested reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>{invoice.reason}</p>
            {invoice.note ? (
              <p className="rounded-md border bg-muted p-3 text-foreground">
                {invoice.note}
              </p>
            ) : null}
            <div className="flex gap-2">
              <Button disabled>Accept</Button>
              <Button variant="outline" disabled>
                Reject
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
};
