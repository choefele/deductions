import { useLoaderData } from 'react-router';

import type {
  InvoiceItemSummary,
  TaxCategoryId,
} from '../../shared/deductions';
import { categoryLabel } from '@/navigation';
import { InvoiceTable } from '@/components/InvoiceTable';

export const CategoryView = () => {
  const { year, categoryId, invoiceItems } = useLoaderData() as {
    year: number;
    categoryId: TaxCategoryId;
    invoiceItems: InvoiceItemSummary[];
  };

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {categoryLabel(categoryId)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {year} · {invoiceItems.length} item
          {invoiceItems.length === 1 ? '' : 's'}. Items here may be relevant
          for this category and still need your review.
        </p>
      </div>
      <InvoiceTable invoiceItems={invoiceItems} />
    </main>
  );
};
