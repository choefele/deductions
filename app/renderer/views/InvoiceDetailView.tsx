import { Link, useLoaderData } from 'react-router';

import type { InvoiceItemDetail } from '../../shared/data';
import { categoryPath, categoryLabel } from '@/navigation';
import { StatusBadge } from '@/components/StatusBadge';
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
  const invoiceItem = useLoaderData() as InvoiceItemDetail;

  return (
    <main className="max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {invoiceItem.vendor}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoiceItem.document?.originalFileName ?? 'No source document'}
        </p>
      </div>

      <section className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Review</CardTitle>
            <CardDescription>
              Extracted facts and review decision for this invoice item.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={invoiceItem.reviewStatus} />
            </div>
            <Separator />
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Vendor</dt>
                <dd className="text-right font-medium">{invoiceItem.vendor}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="text-right">
                  {formatDate(invoiceItem.invoiceDate)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="text-right font-medium">
                  {formatCurrency(invoiceItem.amount, invoiceItem.currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Invoice no.</dt>
                <dd className="text-right">
                  {invoiceItem.invoiceNumber ?? 'Unknown'}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Item</dt>
                <dd className="text-right">{invoiceItem.description}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="text-right">
                  <Link
                    className="font-medium underline-offset-4 hover:underline"
                    to={categoryPath(
                      invoiceItem.taxYear,
                      invoiceItem.categoryId,
                    )}
                  >
                    {categoryLabel(invoiceItem.categoryId)}
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
            <p>{invoiceItem.deductionReason}</p>
            {invoiceItem.note ? (
              <p className="rounded-md border bg-muted p-3 text-foreground">
                {invoiceItem.note}
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
      </section>
    </main>
  );
};
