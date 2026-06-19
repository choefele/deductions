import {
  reviewStatuses,
  taxCategoryIds,
  type ReviewStatus,
  type TaxCategoryId,
  type UpdateInvoiceItemReviewRequest,
} from '../../shared/data';

const minimumTaxYear = 1900;
const maximumTaxYear = 2200;

export type NormalizedInvoiceItemReviewUpdate = {
  invoiceItemId: string;
  invoice: {
    vendor: string;
    invoiceDate: string;
    invoiceNumber: string | null;
  };
  item: {
    description: string;
    amountCents: number;
    amount: number;
    taxYear: number;
    categoryId: TaxCategoryId;
    reviewStatus: ReviewStatus;
    note: string | null;
    deductionReason?: string | null;
  };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const readRequiredObject = (
  channel: string,
  value: unknown,
  label: string,
): Record<string, unknown> => {
  if (!isPlainObject(value)) {
    throw new Error(`${channel} received an invalid ${label}`);
  }

  return value;
};

const readNonEmptyString = (
  channel: string,
  value: unknown,
  label: string,
) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${channel} received an invalid ${label}`);
  }

  return value.trim();
};

const readOptionalString = (
  channel: string,
  value: unknown,
  label: string,
) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw new Error(`${channel} received an invalid ${label}`);
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readIsoDate = (channel: string, value: unknown) => {
  const date = readNonEmptyString(channel, value, 'invoice date');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`${channel} received an invalid invoice date`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error(`${channel} received an invalid invoice date`);
  }

  return date;
};

const readAmount = (channel: string, value: unknown) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${channel} received an invalid amount`);
  }

  const amountCents = Math.round(value * 100);

  if (amountCents <= 0 || !Number.isSafeInteger(amountCents)) {
    throw new Error(`${channel} received an invalid amount`);
  }

  return {
    amount: amountCents / 100,
    amountCents,
  };
};

const readTaxYear = (channel: string, value: unknown) => {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimumTaxYear ||
    value > maximumTaxYear
  ) {
    throw new Error(`${channel} received an invalid tax year`);
  }

  return value;
};

const readCategoryId = (channel: string, value: unknown): TaxCategoryId => {
  if (
    typeof value !== 'string' ||
    !taxCategoryIds.includes(value as TaxCategoryId)
  ) {
    throw new Error(`${channel} received an invalid category id`);
  }

  return value as TaxCategoryId;
};

const readReviewStatus = (channel: string, value: unknown): ReviewStatus => {
  if (
    typeof value !== 'string' ||
    !reviewStatuses.includes(value as ReviewStatus)
  ) {
    throw new Error(`${channel} received an invalid review status`);
  }

  return value as ReviewStatus;
};

export const normalizeUpdateInvoiceItemReviewRequest = (
  channel: string,
  value: unknown,
): NormalizedInvoiceItemReviewUpdate => {
  const request = readRequiredObject(channel, value, 'review update request');
  const invoice = readRequiredObject(channel, request.invoice, 'invoice');
  const item = readRequiredObject(channel, request.item, 'invoice item');
  const amount = readAmount(channel, item.amount);
  const normalizedItem: NormalizedInvoiceItemReviewUpdate['item'] = {
    description: readNonEmptyString(channel, item.description, 'description'),
    ...amount,
    taxYear: readTaxYear(channel, item.taxYear),
    categoryId: readCategoryId(channel, item.categoryId),
    reviewStatus: readReviewStatus(channel, item.reviewStatus),
    note: readOptionalString(channel, item.note, 'note'),
  };

  if ('deductionReason' in item) {
    normalizedItem.deductionReason = readOptionalString(
      channel,
      item.deductionReason,
      'deduction reason',
    );
  }

  return {
    invoiceItemId: readNonEmptyString(
      channel,
      request.invoiceItemId,
      'invoice item id',
    ),
    invoice: {
      vendor: readNonEmptyString(channel, invoice.vendor, 'vendor'),
      invoiceDate: readIsoDate(channel, invoice.invoiceDate),
      invoiceNumber: readOptionalString(
        channel,
        invoice.invoiceNumber,
        'invoice number',
      ),
    },
    item: normalizedItem,
  };
};

export const toUpdateInvoiceItemReviewRequest = (
  request: NormalizedInvoiceItemReviewUpdate,
): UpdateInvoiceItemReviewRequest => {
  const item: UpdateInvoiceItemReviewRequest['item'] = {
    description: request.item.description,
    amount: request.item.amount,
    taxYear: request.item.taxYear,
    categoryId: request.item.categoryId,
    reviewStatus: request.item.reviewStatus,
    note: request.item.note ?? '',
  };

  if (request.item.deductionReason !== undefined) {
    item.deductionReason = request.item.deductionReason ?? '';
  }

  return {
    invoiceItemId: request.invoiceItemId,
    invoice: {
      vendor: request.invoice.vendor,
      invoiceDate: request.invoice.invoiceDate,
      invoiceNumber: request.invoice.invoiceNumber ?? undefined,
    },
    item,
  };
};
