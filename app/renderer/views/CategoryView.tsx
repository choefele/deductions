import { useLoaderData } from 'react-router';

import type { Invoice, TaxCategoryId } from '@/data/deductionRepository';
import { categoryLabel } from '@/navigation';
import { InvoiceTable } from '@/components/InvoiceTable';

export const CategoryView = () => {
  const { year, categoryId, invoices } = useLoaderData() as {
    year: number;
    categoryId: TaxCategoryId;
    invoices: Invoice[];
  };

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {categoryLabel(categoryId)}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {year} · {invoices.length} invoice{invoices.length === 1 ? '' : 's'}.
          Items here may be relevant for this category and still need your review.
        </p>
      </div>
      <InvoiceTable invoices={invoices} />
    </main>
  );
};
