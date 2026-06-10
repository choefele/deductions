import { useLoaderData } from 'react-router';

import type { Invoice, ReviewQueueId } from '@/data/deductionRepository';
import { reviewQueueLabels } from '@/navigation';
import { InvoiceTable } from '@/components/InvoiceTable';

export const ReviewQueueView = () => {
  const { queue, invoices } = useLoaderData() as {
    queue: ReviewQueueId;
    invoices: Invoice[];
  };

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {reviewQueueLabels[queue]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoices.length} open todo{invoices.length === 1 ? '' : 's'} in this queue.
        </p>
      </div>
      <InvoiceTable invoices={invoices} />
    </main>
  );
};
