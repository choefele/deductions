import type { LoaderFunctionArgs } from 'react-router';

import { taxCategoryIds } from '../shared/data';
import type { ReviewStatus, TaxCategoryId } from '../shared/data';
import { deductionsData } from './data/repository';

const readYearParam = (params: LoaderFunctionArgs['params']) => {
  const year = Number(params.year);

  if (!Number.isInteger(year)) {
    throw new Response('Invalid tax year', { status: 400 });
  }

  return year;
};

const loadTaxYearReviewQueue = async (
  year: number,
  queue: ReviewStatus,
) => {
  const summary = await deductionsData.getTaxYearSummary(year);

  if (!summary) {
    throw new Response('Tax year not found', { status: 404 });
  }

  return {
    year,
    queue,
    invoiceItems: (
      await deductionsData.listInvoiceItemsByReviewStatus(queue)
    ).filter((item) => item.taxYear === year),
  };
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

export const taxYearPendingReviewLoader = async ({
  params,
}: LoaderFunctionArgs) =>
  loadTaxYearReviewQueue(readYearParam(params), 'pending');

export const taxYearAcceptedReviewLoader = async ({
  params,
}: LoaderFunctionArgs) =>
  loadTaxYearReviewQueue(readYearParam(params), 'accepted');

export const taxYearRejectedReviewLoader = async ({
  params,
}: LoaderFunctionArgs) =>
  loadTaxYearReviewQueue(readYearParam(params), 'rejected');

export const sourcesLoader = async () => deductionsData.listSources();

export const documentsLoader = async () =>
  deductionsData.listDocumentSummaries();

export const documentLoader = async ({ params }: LoaderFunctionArgs) => {
  const documentId = params.documentId;

  if (!documentId) {
    throw new Response('Document id is required', { status: 400 });
  }

  const [document, documents] = await Promise.all([
    deductionsData.getDocumentDetail(documentId),
    deductionsData.listDocumentSummaries(),
  ]);

  if (!document) {
    throw new Response('Document not found', { status: 404 });
  }

  return { document, documents };
};
