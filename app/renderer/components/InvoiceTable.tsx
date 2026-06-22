import type { InvoiceItemSummary } from '../../shared/data';
import {
  categoryLabel,
  invoicePath,
  invoiceReviewQueuePath,
  type ReviewQueueId,
} from '@/navigation';
import { ReviewTableRow } from './review/ReviewTableRow';
import { StatusBadge } from './StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

const formatCurrency = (amount: number, currency: string) =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

export const InvoiceTable = ({
  invoiceItems,
  reviewQueueContext,
}: {
  invoiceItems: InvoiceItemSummary[];
  reviewQueueContext?: {
    year: number;
    queue: ReviewQueueId;
  };
}) => {
  if (invoiceItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <h3 className="text-sm font-medium">No invoices here yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          This view will fill up as documents are imported and reviewed.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <Table className="table-fixed">
        <colgroup>
          <col className="w-auto" />
          <col className="w-28" />
          <col className="w-36" />
          <col className="w-28" />
          <col className="w-28" />
        </colgroup>
        <TableHeader>
          <TableRow>
            <TableHead>Vendor</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoiceItems.map((invoiceItem) => {
            const detailPath = reviewQueueContext
              ? invoiceReviewQueuePath(
                  invoiceItem.id,
                  reviewQueueContext.year,
                  reviewQueueContext.queue,
                )
              : invoicePath(invoiceItem.id);

            return (
              <ReviewTableRow key={invoiceItem.id} to={detailPath}>
                <TableCell className="min-w-0 whitespace-normal py-3">
                  <div className="break-words font-medium text-foreground">
                    {invoiceItem.vendor}
                  </div>
                <div className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                  {invoiceItem.description}
                </div>
                </TableCell>
                <TableCell>{formatDate(invoiceItem.invoiceDate)}</TableCell>
                <TableCell className="truncate">
                  {categoryLabel(invoiceItem.categoryId)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoiceItem.reviewStatus} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(invoiceItem.amount, invoiceItem.currency)}
                </TableCell>
              </ReviewTableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
