import type {
  InvoiceItemDetail,
  ReviewStatus,
  TaxCategoryId,
  TaxYearSummary,
} from '../shared/data';
import { taxCategories } from '../shared/data';

export type ReviewQueueId = ReviewStatus;

export type AppSelection =
  | { type: 'all-years' }
  | { type: 'tax-year'; year: number }
  | { type: 'category'; year: number; categoryId: TaxCategoryId }
  | { type: 'invoice'; invoice: InvoiceItemDetail }
  | { type: 'review-queue'; queue: ReviewQueueId }
  | { type: 'sources' }
  | { type: 'import-result' };

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export const categoryPath = (year: number, categoryId: TaxCategoryId) =>
  `/years/${year}/categories/${categoryId}`;

export const taxYearPath = (year: number) => `/years/${year}`;

export const invoicePath = (invoiceId: string) => `/invoices/${invoiceId}`;

export const reviewQueuePath = (queue: ReviewQueueId) => `/review/${queue}`;

export const reviewQueueLabels: Record<ReviewQueueId, string> = {
  pending: 'Pending review',
  accepted: 'Accepted items',
  rejected: 'Rejected items',
};

export const getBreadcrumbs = (selection: AppSelection): BreadcrumbItem[] => {
  const root: BreadcrumbItem = { label: 'Deductions', to: '/' };

  switch (selection.type) {
    case 'all-years':
      return [{ label: 'Deductions' }];
    case 'tax-year':
      return [root, { label: String(selection.year) }];
    case 'category':
      return [
        root,
        { label: String(selection.year), to: taxYearPath(selection.year) },
        { label: categoryLabel(selection.categoryId) },
      ];
    case 'invoice':
      return [
        root,
        {
          label: String(selection.invoice.taxYear),
          to: taxYearPath(selection.invoice.taxYear),
        },
        {
          label: categoryLabel(selection.invoice.categoryId),
          to: categoryPath(selection.invoice.taxYear, selection.invoice.categoryId),
        },
        { label: selection.invoice.vendor },
      ];
    case 'review-queue':
      return [root, { label: reviewQueueLabels[selection.queue] }];
    case 'sources':
      return [root, { label: 'Sources' }];
    case 'import-result':
      return [root, { label: 'Import result' }];
  }
};

export const categoryLabel = (categoryId: TaxCategoryId) => {
  return (
    taxCategories.find((category) => category.id === categoryId)?.label ??
    categoryId
  );
};

export const getSelectionForPath = (
  pathname: string,
  years: TaxYearSummary[],
): AppSelection => {
  if (pathname === '/' || pathname === '') {
    return { type: 'all-years' };
  }

  if (pathname === '/sources') {
    return { type: 'sources' };
  }

  if (pathname === '/import-result') {
    return { type: 'import-result' };
  }

  const reviewMatch = pathname.match(/^\/review\/([^/]+)$/);
  if (reviewMatch) {
    return {
      type: 'review-queue',
      queue: reviewMatch[1] as ReviewQueueId,
    };
  }

  const categoryMatch = pathname.match(
    /^\/years\/(\d{4})\/categories\/([^/]+)$/,
  );
  if (categoryMatch) {
    return {
      type: 'category',
      year: Number(categoryMatch[1]),
      categoryId: categoryMatch[2] as TaxCategoryId,
    };
  }

  const yearMatch = pathname.match(/^\/years\/(\d{4})$/);
  if (yearMatch) {
    return { type: 'tax-year', year: Number(yearMatch[1]) };
  }

  return years[0] ? { type: 'tax-year', year: years[0].year } : { type: 'all-years' };
};
