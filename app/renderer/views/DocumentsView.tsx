import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useLoaderData, useLocation, useSearchParams } from 'react-router';
import { AlertCircle, CheckCircle2, Clock3, FileText } from 'lucide-react';

import type {
  DocumentDetail,
  DocumentListSummary,
  DocumentStatus,
  InvoiceItemDetail,
} from '../../shared/data';
import type { ImportFilesResult } from '../../shared/imports';
import { invoicePath, reviewQueuePath, taxYearPath } from '@/navigation';
import { formatSelectionStatus } from '@/selectionStatus';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from './viewUtils';

const statusLabel: Record<DocumentStatus, string> = {
  imported: 'Imported',
  processing: 'Processing',
  needs_review: 'Needs review',
  processed: 'Processed',
};

const statusVariant = (status: DocumentStatus) => {
  if (status === 'needs_review') {
    return 'destructive' as const;
  }

  if (status === 'processed') {
    return 'secondary' as const;
  }

  return 'outline' as const;
};

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

const pluralize = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? '' : 's'}`;

const latestImportStorageKey = 'deductions.latestImportResult';

const readStoredLatestImport = () => {
  const value = window.sessionStorage.getItem(latestImportStorageKey);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ImportFilesResult;
  } catch {
    window.sessionStorage.removeItem(latestImportStorageKey);
    return null;
  }
};

const emptyImportResult = (): ImportFilesResult => ({
  canceled: false,
  filePaths: [],
  accepted: [],
  skipped: [],
  failed: [],
});

const LatestImportSummary = ({
  result,
}: {
  result: ImportFilesResult;
}) => {
  const hasOutcomes =
    result.accepted.length + result.skipped.length + result.failed.length > 0;
  const summary = hasOutcomes
    ? formatSelectionStatus(result)
    : 'No import in this session.';

  return (
    <section className="space-y-3 rounded-md border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Latest import</h2>
        <span className="text-sm text-muted-foreground">
          {summary}
        </span>
      </div>
      <div className="grid gap-3 text-sm md:grid-cols-3">
        <ImportOutcomeList
          icon={<CheckCircle2 className="size-4 text-emerald-700" />}
          label="Imported"
          items={result.accepted.map((file) => ({
            id: file.documentId,
            name: file.originalFileName,
            detail: file.storagePath,
          }))}
        />
        <ImportOutcomeList
          icon={<Clock3 className="size-4 text-amber-700" />}
          label="Skipped"
          items={result.skipped.map((file) => ({
            id: `${file.filePath}-${file.existingDocumentId}`,
            name: file.originalFileName,
            detail: 'Already imported.',
          }))}
        />
        <ImportOutcomeList
          icon={<AlertCircle className="size-4 text-destructive" />}
          label="Failed"
          items={result.failed.map((file, index) => ({
            id: file.filePath || `${file.originalFileName}-${index}`,
            name: file.originalFileName,
            detail: file.reason,
          }))}
        />
      </div>
    </section>
  );
};

const ImportOutcomeList = ({
  icon,
  label,
  items,
}: {
  icon: ReactNode;
  label: string;
  items: Array<{ id: string; name: string; detail: string }>;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 font-medium">
      {icon}
      {label}
      <Badge variant="outline">{items.length}</Badge>
    </div>
    {items.length > 0 ? (
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id} className="rounded-md border bg-background p-2">
            <div className="break-words font-medium">{item.name}</div>
            <div className="break-words text-muted-foreground">{item.detail}</div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground">None.</p>
    )}
  </div>
);

const DocumentDetailPanel = ({
  detail,
}: {
  detail: DocumentDetail | null;
}) => {
  if (!detail) {
    return (
      <aside className="rounded-md border p-4 text-sm text-muted-foreground">
        No document selected.
      </aside>
    );
  }

  const items = detail.invoices.flatMap((invoice) => invoice.items);

  return (
    <aside className="space-y-5 rounded-md border p-4">
      <div className="space-y-1">
        <h2 className="break-words text-base font-semibold">
          {detail.originalFileName}
        </h2>
        <p className="text-sm text-muted-foreground">{detail.storagePath}</p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <DetailValue label="Source" value={detail.sourceLabel} />
        <DetailValue label="Imported" value={formatDateTime(detail.importedAt)} />
        <DetailValue label="MIME type" value={detail.mimeType} />
        <DetailValue label="SHA-256" value={detail.sha256} wide />
      </dl>
      {detail.taxYears.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {detail.taxYears.map((taxYear) => (
            <Button key={taxYear} asChild size="sm" variant="secondary">
              <Link
                to={
                  detail.pendingItemCount > 0
                    ? reviewQueuePath(taxYear, 'pending')
                    : taxYearPath(taxYear)
                }
              >
                {taxYear}
              </Link>
            </Button>
          ))}
        </div>
      ) : null}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Items</h3>
        {items.length > 0 ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <DocumentItemLink key={item.id} item={item} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No linked items.</p>
        )}
      </div>
    </aside>
  );
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
  <div className={wide ? 'col-span-2' : undefined}>
    <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
    <dd className="break-words font-medium">{value}</dd>
  </div>
);

const DocumentItemLink = ({ item }: { item: InvoiceItemDetail }) => (
  <li>
    <Link
      to={invoicePath(item.id)}
      className="block rounded-md border p-3 text-sm transition-colors hover:bg-muted/50"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="break-words font-medium">{item.description}</div>
          <div className="break-words text-muted-foreground">
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

export const DocumentsView = () => {
  const documents = useLoaderData() as DocumentListSummary[];
  const location = useLocation();
  const routeLatestImport = location.state as ImportFilesResult | null;
  const [latestImport, setLatestImport] = useState<ImportFilesResult>(
    () => routeLatestImport ?? readStoredLatestImport() ?? emptyImportResult(),
  );
  const acceptedDocumentIds = useMemo(
    () => new Set(latestImport?.accepted.map((file) => file.documentId) ?? []),
    [latestImport],
  );
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDocumentId =
    searchParams.get('document') ?? documents[0]?.id ?? null;
  const [detail, setDetail] = useState<DocumentDetail | null>(null);

  useEffect(() => {
    if (!routeLatestImport) {
      return;
    }

    setLatestImport(routeLatestImport);
    window.sessionStorage.setItem(
      latestImportStorageKey,
      JSON.stringify(routeLatestImport),
    );
  }, [routeLatestImport]);

  useEffect(() => {
    let isActive = true;
    setDetail(null);

    if (!selectedDocumentId) {
      return () => {
        isActive = false;
      };
    }

    window.deductions.data
      .getDocumentDetail(selectedDocumentId)
      .then((documentDetail) => {
        if (isActive) {
          setDetail(documentDetail);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedDocumentId]);

  const documentCount = documents.length;

  return (
    <main className="min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pluralize(documentCount, 'imported document')} in the active profile.
        </p>
      </div>
      <LatestImportSummary result={latestImport} />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 overflow-hidden rounded-md border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[31%] whitespace-normal">File name</TableHead>
                <TableHead className="w-[15%] whitespace-normal">Source</TableHead>
                <TableHead className="w-[18%] whitespace-normal">Imported</TableHead>
                <TableHead className="w-[18%] whitespace-normal">Status</TableHead>
                <TableHead className="w-[8%] whitespace-normal text-right">
                  Items
                </TableHead>
                <TableHead className="w-[10%] whitespace-normal">Tax year</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map((document) => {
                  const isSelected = document.id === selectedDocumentId;
                  const isNew = acceptedDocumentIds.has(document.id);

                  return (
                    <TableRow
                      key={document.id}
                      aria-selected={isSelected}
                      className={isNew ? 'bg-emerald-50/60' : undefined}
                      tabIndex={0}
                      onClick={() => setSearchParams({ document: document.id })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSearchParams({ document: document.id });
                        }
                      }}
                    >
                      <TableCell className="whitespace-normal break-words font-medium">
                        {document.originalFileName}
                      </TableCell>
                      <TableCell className="whitespace-normal break-words">
                        {document.sourceLabel}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {formatDateTime(document.importedAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(document.status)}>
                          {statusLabel[document.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {document.invoiceItemCount}
                      </TableCell>
                      <TableCell>
                        {document.taxYears.length > 0
                          ? document.taxYears.join(', ')
                          : 'None'}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No imported documents.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
        <div className="min-w-0">
          <DocumentDetailPanel detail={detail} />
        </div>
      </div>
    </main>
  );
};
