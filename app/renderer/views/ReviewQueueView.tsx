import { useLoaderData } from 'react-router';

import type { InvoiceItemSummary } from '../../shared/data';
import { reviewQueueLabels, type ReviewQueueId } from '@/navigation';
import { InvoiceTable } from '@/components/InvoiceTable';

export const ReviewQueueView = () => {
  const { year, queue, invoiceItems } = useLoaderData() as {
    year: number;
    queue: ReviewQueueId;
    invoiceItems: InvoiceItemSummary[];
  };

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {reviewQueueLabels[queue]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {year} · {invoiceItems.length} item
          {invoiceItems.length === 1 ? '' : 's'} in this view.
        </p>
      </div>
      <InvoiceTable invoiceItems={invoiceItems} />
    </main>
  );
};
