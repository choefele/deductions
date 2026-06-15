import { useLoaderData } from 'react-router';

import type { InvoiceItemSummary } from '../../shared/deductions';
import { reviewQueueLabels, type ReviewQueueId } from '@/navigation';
import { InvoiceTable } from '@/components/InvoiceTable';

export const ReviewQueueView = () => {
  const { queue, invoiceItems } = useLoaderData() as {
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
          {invoiceItems.length} item{invoiceItems.length === 1 ? '' : 's'} in
          this queue.
        </p>
      </div>
      <InvoiceTable invoiceItems={invoiceItems} />
    </main>
  );
};
