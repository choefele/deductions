import { Link } from 'react-router';

import type { InvoiceItemSummary } from '../../shared/data';
import { categoryLabel, invoicePath } from '@/navigation';
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
}: {
  invoiceItems: InvoiceItemSummary[];
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
      <Table>
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
          {invoiceItems.map((invoiceItem) => (
            <TableRow key={invoiceItem.id}>
              <TableCell className="min-w-52">
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  to={invoicePath(invoiceItem.id)}
                >
                  {invoiceItem.vendor}
                </Link>
                <div className="mt-1 text-xs text-muted-foreground">
                  {invoiceItem.description}
                </div>
              </TableCell>
              <TableCell>{formatDate(invoiceItem.invoiceDate)}</TableCell>
              <TableCell>{categoryLabel(invoiceItem.categoryId)}</TableCell>
              <TableCell>
                <StatusBadge status={invoiceItem.reviewStatus} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(invoiceItem.amount, invoiceItem.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
