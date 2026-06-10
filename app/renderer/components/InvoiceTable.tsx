import { Link } from 'react-router';

import type { Invoice } from '@/data/deductionRepository';
import { categoryLabel, invoicePath } from '@/navigation';
import { ConfidenceBadge, FlagBadge, StatusBadge } from './StatusBadge';
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

export const InvoiceTable = ({ invoices }: { invoices: Invoice[] }) => {
  if (invoices.length === 0) {
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
            <TableHead>Confidence</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id}>
              <TableCell className="min-w-52">
                <Link
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                  to={invoicePath(invoice.id)}
                >
                  {invoice.vendor}
                </Link>
                <div className="mt-1 flex flex-wrap gap-1">
                  {invoice.flags.map((flag) => (
                    <FlagBadge key={flag} flag={flag} />
                  ))}
                </div>
              </TableCell>
              <TableCell>{formatDate(invoice.date)}</TableCell>
              <TableCell>{categoryLabel(invoice.categoryId)}</TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} />
              </TableCell>
              <TableCell>
                <ConfidenceBadge confidence={invoice.confidence} />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(invoice.amount, invoice.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
