import type { ReactNode } from 'react';
import { AlertCircle, ExternalLink, FileText } from 'lucide-react';

import type {
  DocumentStatus,
  InvoiceSourceDocumentSummary,
} from '../../../shared/data';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const documentStatusLabels: Record<DocumentStatus, string> = {
  imported: 'Ready to process',
  processing: 'Processing',
  needs_review: 'Needs review',
  processed: 'Processed',
};

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

const statusVariant = (status?: DocumentStatus) => {
  if (status === 'needs_review') {
    return 'destructive' as const;
  }

  if (status === 'processed') {
    return 'secondary' as const;
  }

  return 'outline' as const;
};

const DetailValue = ({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) => (
  <div className={wide ? 'sm:col-span-2' : undefined}>
    <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
    <dd className="wrap-break-word font-medium">{value}</dd>
  </div>
);

export const SourceDocumentPanel = ({
  document,
  actions,
  previewAction,
}: {
  document: InvoiceSourceDocumentSummary | null;
  actions?: ReactNode;
  previewAction?: () => void;
}) => {
  if (!document) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" />
            Source document
          </CardTitle>
          <CardDescription>No source document is linked.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 shrink-0" />
              <span className="wrap-break-word">{document.originalFileName}</span>
            </CardTitle>
            <CardDescription className="wrap-break-word">
              {document.storagePath}
            </CardDescription>
          </div>
          {document.status ? (
            <Badge
              variant={statusVariant(document.status)}
              className="max-w-full"
            >
              <span className="truncate">{documentStatusLabels[document.status]}</span>
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <DetailValue
            label="Source"
            value={document.sourceLabel ?? document.sourceId}
          />
          <DetailValue label="Imported" value={formatDateTime(document.importedAt)} />
          {document.processingCompletedAt ? (
            <DetailValue
              label="Completed"
              value={formatDateTime(document.processingCompletedAt)}
            />
          ) : null}
          {document.processorVersion ? (
            <DetailValue label="Processor" value={document.processorVersion} />
          ) : null}
          <DetailValue label="SHA-256" value={document.sha256} wide />
        </dl>
        {document.latestError ? (
          <div className="wrap-break-word flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{document.latestError}</p>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {previewAction ? (
            <Button type="button" variant="outline" onClick={previewAction}>
              <ExternalLink className="size-4" />
              View document
            </Button>
          ) : null}
          {actions}
        </div>
      </CardContent>
    </Card>
  );
};
