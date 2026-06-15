import type { LoaderFunctionArgs } from 'react-router';

import { reviewStatuses, taxCategoryIds } from '../shared/deductions';
import type { ReviewStatus, TaxCategoryId } from '../shared/deductions';
import { deductionsData } from './data/repository';

const readYearParam = (params: LoaderFunctionArgs['params']) => {
  const year = Number(params.year);

  if (!Number.isInteger(year)) {
    throw new Response('Invalid tax year', { status: 400 });
  }

  return year;
};

export const rootLoader = async () => ({
  allYears: await deductionsData.getAllYearsSummary(),
  taxYears: await deductionsData.listTaxYears(),
  categories: await deductionsData.listCategories(),
  sources: await deductionsData.listSources(),
});

export const allYearsLoader = async () =>
  deductionsData.getAllYearsSummary();

export const taxYearLoader = async ({ params }: LoaderFunctionArgs) => {
  const year = readYearParam(params);
  const summary = await deductionsData.getTaxYearSummary(year);

  if (!summary) {
    throw new Response('Tax year not found', { status: 404 });
  }

  return summary;
};

export const categoryLoader = async ({ params }: LoaderFunctionArgs) => {
  const year = readYearParam(params);
  const categoryId = params.categoryId as TaxCategoryId;

  if (!taxCategoryIds.includes(categoryId)) {
    throw new Response('Category not found', { status: 404 });
  }

  return {
    year,
    categoryId,
    invoiceItems: await deductionsData.listInvoiceItemsByCategory(
      year,
      categoryId,
    ),
  };
};

export const invoiceLoader = async ({ params }: LoaderFunctionArgs) => {
  const invoiceId = params.invoiceId;

  if (!invoiceId) {
    throw new Response('Invoice id is required', { status: 400 });
  }

  const invoice = await deductionsData.getInvoiceItemById(invoiceId);

  if (!invoice) {
    throw new Response('Invoice not found', { status: 404 });
  }

  return invoice;
};

export const reviewQueueLoader = async ({ params }: LoaderFunctionArgs) => {
  const queue = params.queue as ReviewStatus;

  if (!reviewStatuses.includes(queue)) {
    throw new Response('Review queue not found', { status: 404 });
  }

  return {
    queue,
    invoiceItems: await deductionsData.listInvoiceItemsByReviewStatus(queue),
  };
};

export const sourcesLoader = async () => deductionsData.listSources();
