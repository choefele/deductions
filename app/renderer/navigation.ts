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
  | { type: 'tax-year-review-queue'; year: number; queue: ReviewQueueId }
  | { type: 'category'; year: number; categoryId: TaxCategoryId }
  | { type: 'invoice'; invoice: InvoiceItemDetail }
  | { type: 'sources' }
  | { type: 'documents' };

export type BreadcrumbItem = {
  label: string;
  to?: string;
};

export const categoryPath = (year: number, categoryId: TaxCategoryId) =>
  `/years/${year}/categories/${categoryId}`;

export const taxYearPath = (year: number) => `/years/${year}`;

export const invoicePath = (invoiceId: string) => `/invoices/${invoiceId}`;

export const invoiceReviewQueuePath = (
  invoiceId: string,
  year: number,
  queue: ReviewQueueId,
) => {
  const params = new URLSearchParams({
    year: String(year),
    queue,
  });

  return `${invoicePath(invoiceId)}?${params.toString()}`;
};

export const documentsPath = () => '/documents';

export const documentPath = (documentId: string) => `/documents/${documentId}`;

export const reviewQueuePath = (year: number, queue: ReviewQueueId) =>
  queue === 'pending' ? `/years/${year}/review` : `/years/${year}/${queue}`;

export const reviewQueueLabels: Record<ReviewQueueId, string> = {
  pending: 'Review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const getBreadcrumbs = (selection: AppSelection): BreadcrumbItem[] => {
  const root: BreadcrumbItem = { label: 'Deductions', to: '/' };

  switch (selection.type) {
    case 'all-years':
      return [{ label: 'Deductions' }];
    case 'tax-year':
      return [root, { label: String(selection.year) }];
    case 'tax-year-review-queue':
      return [
        root,
        { label: String(selection.year), to: taxYearPath(selection.year) },
        { label: reviewQueueLabels[selection.queue] },
      ];
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
    case 'sources':
      return [root, { label: 'Sources' }];
    case 'documents':
      return [root, { label: 'Documents' }];
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

  if (pathname === documentsPath()) {
    return { type: 'documents' };
  }

  if (pathname.match(/^\/documents\/[^/]+$/)) {
    return { type: 'documents' };
  }

  const yearReviewMatch = pathname.match(
    /^\/years\/(\d{4})\/(review|accepted|rejected)$/,
  );
  if (yearReviewMatch) {
    return {
      type: 'tax-year-review-queue',
      year: Number(yearReviewMatch[1]),
      queue:
        yearReviewMatch[2] === 'review'
          ? 'pending'
          : (yearReviewMatch[2] as ReviewQueueId),
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
