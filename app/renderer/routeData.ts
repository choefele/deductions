import type { LoaderFunctionArgs } from 'react-router';

import type { ReviewQueueId, TaxCategoryId } from './data/deductionRepository';
import { deductionRepository } from './data/repository';

const readYearParam = (params: LoaderFunctionArgs['params']) => {
  const year = Number(params.year);

  if (!Number.isInteger(year)) {
    throw new Response('Invalid tax year', { status: 400 });
  }

  return year;
};

export const rootLoader = async () => ({
  allYears: await deductionRepository.getAllYearsSummary(),
  taxYears: await deductionRepository.listTaxYears(),
  categories: await deductionRepository.listCategories(),
  sources: await deductionRepository.listSources(),
});

export const allYearsLoader = async () =>
  deductionRepository.getAllYearsSummary();

export const taxYearLoader = async ({ params }: LoaderFunctionArgs) => {
  const year = readYearParam(params);
  const summary = await deductionRepository.getTaxYearSummary(year);

  if (!summary) {
    throw new Response('Tax year not found', { status: 404 });
  }

  return summary;
};

export const categoryLoader = async ({ params }: LoaderFunctionArgs) => {
  const year = readYearParam(params);
  const categoryId = params.categoryId as TaxCategoryId;

  return {
    year,
    categoryId,
    invoices: await deductionRepository.listInvoicesByCategory(year, categoryId),
  };
};

export const invoiceLoader = async ({ params }: LoaderFunctionArgs) => {
  const invoiceId = params.invoiceId;

  if (!invoiceId) {
    throw new Response('Invoice id is required', { status: 400 });
  }

  const invoice = await deductionRepository.getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Response('Invoice not found', { status: 404 });
  }

  return invoice;
};

export const reviewQueueLoader = async ({ params }: LoaderFunctionArgs) => {
  const queue = params.queue as ReviewQueueId;

  return {
    queue,
    invoices: await deductionRepository.listReviewQueueInvoices(queue),
  };
};

export const sourcesLoader = async () => deductionRepository.listSources();
