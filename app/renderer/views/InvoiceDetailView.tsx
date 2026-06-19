import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  Link,
  useLoaderData,
  useNavigate,
  useRevalidator,
  useSearchParams,
} from 'react-router';

import {
  reviewStatuses,
  taxCategories,
  type InvoiceItemDetail,
  type InvoiceItemSummary,
  type ReviewStatus,
  type TaxCategoryId,
} from '../../shared/data';
import {
  categoryLabel,
  categoryPath,
  invoiceReviewQueuePath,
  reviewQueuePath,
  type ReviewQueueId,
} from '@/navigation';
import { deductionsData } from '@/data/repository';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from './viewUtils';

type ReviewFormState = {
  vendor: string;
  invoiceDate: string;
  invoiceNumber: string;
  description: string;
  amount: string;
  taxYear: string;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
  deductionReason: string;
  note: string;
};

type ReviewQueueContext = {
  year: number;
  queue: ReviewQueueId;
};

const documentStatusLabels = {
  imported: 'Ready to process',
  processing: 'Processing',
  needs_review: 'Needs review',
  processed: 'Processed',
} as const;

const fieldClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50';

const textareaClassName =
  'min-h-20 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50';

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

const formFromInvoiceItem = (invoiceItem: InvoiceItemDetail): ReviewFormState => ({
  vendor: invoiceItem.vendor,
  invoiceDate: invoiceItem.invoiceDate,
  invoiceNumber: invoiceItem.invoiceNumber ?? '',
  description: invoiceItem.description,
  amount: invoiceItem.amount.toFixed(2),
  taxYear: String(invoiceItem.taxYear),
  categoryId: invoiceItem.categoryId,
  reviewStatus: invoiceItem.reviewStatus,
  deductionReason: invoiceItem.deductionReason ?? '',
  note: invoiceItem.note ?? '',
});

const readReviewQueueContext = (
  searchParams: URLSearchParams,
): ReviewQueueContext | null => {
  const year = Number(searchParams.get('year'));
  const queue = searchParams.get('queue') as ReviewQueueId | null;

  if (
    !Number.isInteger(year) ||
    !queue ||
    !reviewStatuses.includes(queue)
  ) {
    return null;
  }

  return { year, queue };
};

const Field = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <label className="grid gap-1.5 text-sm">
    <span className="font-medium">{label}</span>
    {children}
  </label>
);

const SourceDetail = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div>
    <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
    <dd className="wrap-break-word font-medium">{value}</dd>
  </div>
);

export const InvoiceDetailView = () => {
  const loadedInvoiceItem = useLoaderData() as InvoiceItemDetail;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [invoiceItem, setInvoiceItem] = useState(loadedInvoiceItem);
  const [form, setForm] = useState(() => formFromInvoiceItem(loadedInvoiceItem));
  const [queueItems, setQueueItems] = useState<InvoiceItemSummary[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isOpeningDocument, setIsOpeningDocument] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [documentOpenError, setDocumentOpenError] = useState<string | null>(
    null,
  );
  const revalidator = useRevalidator();
  const hasDeductionReason = invoiceItem.deductionReason !== null;
  const document = invoiceItem.document;
  const reviewQueueContext = readReviewQueueContext(searchParams);
  const currentQueueIndex = queueItems.findIndex(
    (item) => item.id === invoiceItem.id,
  );
  const previousQueueItem =
    currentQueueIndex > 0 ? queueItems[currentQueueIndex - 1] : null;
  const nextQueueItem =
    currentQueueIndex >= 0 && currentQueueIndex < queueItems.length - 1
      ? queueItems[currentQueueIndex + 1]
      : null;

  useEffect(() => {
    setInvoiceItem(loadedInvoiceItem);
    setForm(formFromInvoiceItem(loadedInvoiceItem));
    setSaveError(null);
    setSaveMessage(null);
    setDocumentOpenError(null);
  }, [loadedInvoiceItem]);

  useEffect(() => {
    let isActive = true;

    if (!reviewQueueContext) {
      setQueueItems([]);
      return () => {
        isActive = false;
      };
    }

    deductionsData
      .listInvoiceItemsByReviewStatus(reviewQueueContext.queue)
      .then((items) => {
        if (isActive) {
          setQueueItems(
            items.filter((item) => item.taxYear === reviewQueueContext.year),
          );
        }
      });

    return () => {
      isActive = false;
    };
  }, [reviewQueueContext?.queue, reviewQueueContext?.year]);

  const updateForm =
    (field: keyof ReviewFormState) =>
    (
      event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value as ReviewFormState[typeof field],
      }));
    };

  const saveReview = async (
    reviewStatus = form.reviewStatus,
  ): Promise<InvoiceItemDetail | null> => {
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);

    try {
      const request = {
        invoiceItemId: invoiceItem.id,
        invoice: {
          vendor: form.vendor,
          invoiceDate: form.invoiceDate,
          invoiceNumber: form.invoiceNumber,
        },
        item: {
          description: form.description,
          amount: Number(form.amount),
          taxYear: Number(form.taxYear),
          categoryId: form.categoryId,
          reviewStatus,
          note: form.note,
          ...(hasDeductionReason
            ? { deductionReason: form.deductionReason }
            : {}),
        },
      };
      const updated = await deductionsData.updateInvoiceItemReview(request);

      if (!updated) {
        throw new Error('Invoice item not found.');
      }

      setInvoiceItem(updated);
      setForm(formFromInvoiceItem(updated));
      setSaveMessage('Saved.');
      revalidator.revalidate();
      return updated;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Review changes could not be saved.',
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToQueueItem = async (target: InvoiceItemSummary | null) => {
    if (!reviewQueueContext || !target) {
      return;
    }

    const updated = await saveReview();

    if (updated) {
      navigate(
        invoiceReviewQueuePath(
          target.id,
          reviewQueueContext.year,
          reviewQueueContext.queue,
        ),
      );
    }
  };

  const saveDecision = async (reviewStatus: ReviewStatus) => {
    const targetAfterDecision = nextQueueItem;
    const updated = await saveReview(reviewStatus);

    if (!updated || !reviewQueueContext) {
      return;
    }

    if (targetAfterDecision) {
      navigate(
        invoiceReviewQueuePath(
          targetAfterDecision.id,
          reviewQueueContext.year,
          reviewQueueContext.queue,
        ),
      );
      return;
    }

    navigate(reviewQueuePath(reviewQueueContext.year, reviewQueueContext.queue));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void saveReview();
  };

  const openDocumentPreview = async () => {
    if (!document) {
      return;
    }

    setIsOpeningDocument(true);
    setDocumentOpenError(null);

    try {
      const result = await window.deductions.documents.openDocumentPreview(
        document.id,
      );

      if (!result.opened) {
        setDocumentOpenError(result.message ?? 'Document preview could not be opened.');
      }
    } catch (error) {
      setDocumentOpenError(
        error instanceof Error
          ? error.message
          : 'Document preview could not be opened.',
      );
    } finally {
      setIsOpeningDocument(false);
    }
  };

  return (
    <main className="max-w-6xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="wrap-break-word text-2xl font-semibold tracking-tight">
            {invoiceItem.vendor}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoiceItem.description} ·{' '}
            {formatCurrency(invoiceItem.amount, invoiceItem.currency)}
          </p>
        </div>
        <StatusBadge status={invoiceItem.reviewStatus} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Source</CardTitle>
            <CardDescription>
              {document?.originalFileName ?? 'No source document'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {document ? (
              <>
                <dl className="grid gap-3">
                  <SourceDetail label="File" value={document.originalFileName} />
                  <SourceDetail
                    label="Source"
                    value={document.sourceLabel ?? document.sourceId}
                  />
                  <SourceDetail
                    label="Imported"
                    value={formatDateTime(document.importedAt)}
                  />
                  <SourceDetail
                    label="Processing"
                    value={
                      document.status
                        ? documentStatusLabels[document.status]
                        : 'Unknown'
                    }
                  />
                  {document.processingCompletedAt ? (
                    <SourceDetail
                      label="Completed"
                      value={formatDateTime(document.processingCompletedAt)}
                    />
                  ) : null}
                  {document.processorVersion ? (
                    <SourceDetail
                      label="Processor"
                      value={document.processorVersion}
                    />
                  ) : null}
                </dl>
                {document.latestError ? (
                  <p className="wrap-break-word rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                    {document.latestError}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  disabled={isOpeningDocument}
                  onClick={() => void openDocumentPreview()}
                >
                  View document
                </Button>
                {documentOpenError ? (
                  <p className="wrap-break-word rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
                    {documentOpenError}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">
                This item is not linked to an imported document.
              </p>
            )}
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>Review</CardTitle>
                  <CardDescription>
                    Edit extracted facts and the review decision.
                  </CardDescription>
                </div>
                <StatusBadge status={form.reviewStatus} />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Invoice facts</h2>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Vendor">
                    <Input
                      value={form.vendor}
                      onChange={updateForm('vendor')}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field label="Invoice date">
                    <Input
                      type="date"
                      value={form.invoiceDate}
                      onChange={updateForm('invoiceDate')}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field label="Invoice no.">
                    <Input
                      value={form.invoiceNumber}
                      onChange={updateForm('invoiceNumber')}
                      disabled={isSaving}
                    />
                  </Field>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Item details</h2>
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_9rem_7rem]">
                  <Field label="Description">
                    <Input
                      value={form.description}
                      onChange={updateForm('description')}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field label="Amount">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.amount}
                      onChange={updateForm('amount')}
                      disabled={isSaving}
                    />
                  </Field>
                  <Field label="Tax year">
                    <Input
                      type="number"
                      min="1900"
                      max="2200"
                      step="1"
                      value={form.taxYear}
                      onChange={updateForm('taxYear')}
                      disabled={isSaving}
                    />
                  </Field>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <h2 className="text-sm font-semibold">Tax relevance</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Category">
                    <select
                      className={fieldClassName}
                      value={form.categoryId}
                      onChange={updateForm('categoryId')}
                      disabled={isSaving}
                    >
                      {taxCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Review status">
                    <select
                      className={fieldClassName}
                      value={form.reviewStatus}
                      onChange={updateForm('reviewStatus')}
                      disabled={isSaving}
                    >
                      {reviewStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Link
                  className="inline-flex text-sm font-medium underline-offset-4 hover:underline"
                  to={categoryPath(Number(form.taxYear), form.categoryId)}
                >
                  {categoryLabel(form.categoryId)}
                </Link>
              </section>

              {hasDeductionReason ? (
                <>
                  <Separator />
                  <section className="space-y-3">
                    <Field label="Deduction reason">
                      <textarea
                        className={textareaClassName}
                        value={form.deductionReason}
                        onChange={updateForm('deductionReason')}
                        disabled={isSaving}
                      />
                    </Field>
                  </section>
                </>
              ) : null}

              <Separator />

              <section className="space-y-3">
                <Field label="Note">
                  <textarea
                    className={textareaClassName}
                    value={form.note}
                    onChange={updateForm('note')}
                    disabled={isSaving}
                  />
                </Field>
              </section>

              {saveError ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {saveError}
                </p>
              ) : null}
              {saveMessage ? (
                <p className="rounded-md border bg-muted/40 p-3 text-sm">
                  {saveMessage}
                </p>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {reviewQueueContext ? (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving || !previousQueueItem}
                        onClick={() => void navigateToQueueItem(previousQueueItem)}
                      >
                        Previous
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isSaving || !nextQueueItem}
                        onClick={() => void navigateToQueueItem(nextQueueItem)}
                      >
                        Next
                      </Button>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSaving}
                    onClick={() => void saveDecision('rejected')}
                  >
                    Reject
                  </Button>
                  <Button type="submit" variant="secondary" disabled={isSaving}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void saveDecision('accepted')}
                  >
                    Accept
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </main>
  );
};
