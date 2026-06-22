import { useState } from 'react';
import { Link, useLoaderData, useRevalidator } from 'react-router';
import { Play, RotateCcw } from 'lucide-react';

import type {
  DocumentDetail,
  DocumentListSummary,
  InvoiceItemDetail,
} from '../../shared/data';
import { documentPath, documentsPath, invoicePath, reviewQueuePath, taxYearPath } from '@/navigation';
import { ReviewDetailShell } from '@/components/review/ReviewDetailShell';
import { SourceDocumentPanel } from '@/components/review/SourceDocumentPanel';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency, formatDate } from './viewUtils';

const pluralize = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? '' : 's'}`;

const canProcessDocument = (document: DocumentDetail | DocumentListSummary) =>
  document.status === 'imported' || document.status === 'needs_review';

const DocumentProcessButton = ({
  document,
  disabled,
  onProcess,
}: {
  document: DocumentDetail;
  disabled: boolean;
  onProcess: () => void;
}) => {
  if (!canProcessDocument(document)) {
    return null;
  }

  const isRetry = document.status === 'needs_review';
  const Icon = isRetry ? RotateCcw : Play;

  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={onProcess}
    >
      <Icon className="size-4" />
      {isRetry ? 'Re-process' : 'Process'}
    </Button>
  );
};

const DocumentItemLink = ({ item }: { item: InvoiceItemDetail }) => (
  <li>
    <Link
      to={invoicePath(item.id)}
      className="block rounded-md border p-3 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="wrap-break-word font-medium">{item.description}</div>
          <div className="wrap-break-word text-muted-foreground">
            {item.vendor} · {formatDate(item.invoiceDate)} · {item.taxYear}
          </div>
        </div>
        <StatusBadge status={item.reviewStatus} />
      </div>
      <div className="mt-2 font-medium">
        {formatCurrency(item.amount, item.currency)}
      </div>
    </Link>
  </li>
);

export const DocumentDetailView = () => {
  const { document, documents } = useLoaderData() as {
    document: DocumentDetail;
    documents: DocumentListSummary[];
  };
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );
  const [documentOpenError, setDocumentOpenError] = useState<string | null>(
    null,
  );
  const revalidator = useRevalidator();
  const documentIndex = documents.findIndex((item) => item.id === document.id);
  const previousDocument =
    documentIndex > 0 ? documents[documentIndex - 1] : null;
  const nextDocument =
    documentIndex >= 0 && documentIndex < documents.length - 1
      ? documents[documentIndex + 1]
      : null;
  const items = document.invoices.flatMap((invoice) => invoice.items);

  const handleProcessDocument = async () => {
    setProcessingRequestId(document.id);

    try {
      await window.deductions.processing.processDocument(document.id);
      revalidator.revalidate();
    } finally {
      setProcessingRequestId(null);
    }
  };

  const openDocumentPreview = async () => {
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
    }
  };

  return (
    <ReviewDetailShell
      backLabel="Documents"
      backTo={documentsPath()}
      positionLabel={
        documentIndex >= 0 ? `${documentIndex + 1} of ${documents.length}` : undefined
      }
      title={document.originalFileName}
      description={`${pluralize(items.length, 'extracted item')} · ${document.sourceLabel}`}
      previousTo={previousDocument ? documentPath(previousDocument.id) : null}
      nextTo={nextDocument ? documentPath(nextDocument.id) : null}
    >
      <div className="grid gap-6 xl:grid-cols-[minmax(20rem,0.85fr)_minmax(0,1.35fr)]">
        <div className="space-y-4">
          <SourceDocumentPanel
            document={document}
            previewAction={() => void openDocumentPreview()}
            actions={
              <DocumentProcessButton
                document={document}
                disabled={processingRequestId === document.id}
                onProcess={() => void handleProcessDocument()}
              />
            }
          />
          {documentOpenError ? (
            <p className="wrap-break-word rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {documentOpenError}
            </p>
          ) : null}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Extracted invoice items</CardTitle>
                <CardDescription>
                  Items produced from this document.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {document.taxYears.map((taxYear) => (
                  <Button key={taxYear} asChild size="sm" variant="secondary">
                    <Link
                      to={
                        document.pendingItemCount > 0
                          ? reviewQueuePath(taxYear, 'pending')
                          : taxYearPath(taxYear)
                      }
                    >
                      {taxYear}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {items.length > 0 ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <DocumentItemLink key={item.id} item={item} />
                ))}
              </ul>
            ) : (
              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No linked items.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ReviewDetailShell>
  );
};
