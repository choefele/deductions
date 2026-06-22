import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLoaderData, useLocation, useRevalidator } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MoreHorizontal,
  Play,
  RotateCcw,
  Trash2,
} from "lucide-react";

import type { DocumentListSummary, DocumentStatus } from "../../shared/data";
import type { ImportFilesResult } from "../../shared/imports";
import { documentPath } from "@/navigation";
import { formatSelectionStatus } from "@/selectionStatus";
import { ReviewTableRow } from "@/components/review/ReviewTableRow";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabel: Record<DocumentStatus, string> = {
  imported: "Ready to process",
  processing: "Processing",
  needs_review: "Needs review",
  processed: "Processed",
};

const statusVariant = (status: DocumentStatus) => {
  if (status === "needs_review") {
    return "destructive" as const;
  }

  if (status === "processed") {
    return "secondary" as const;
  }

  return "outline" as const;
};

const formatDateTime = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

const pluralize = (count: number, label: string) =>
  `${count} ${label}${count === 1 ? "" : "s"}`;

const latestImportStorageKey = "deductions.latestImportResult";

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

const LatestImportSummary = ({ result }: { result: ImportFilesResult }) => {
  const hasOutcomes =
    result.accepted.length + result.skipped.length + result.failed.length > 0;
  const summary = hasOutcomes
    ? formatSelectionStatus(result)
    : "No import in this session.";

  return (
    <section className="space-y-3 rounded-md border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Latest import</h2>
        <span className="text-sm text-muted-foreground">{summary}</span>
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
            detail: "Already imported.",
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
            <div className="wrap-break-word font-medium">{item.name}</div>
            <div className="wrap-break-word text-muted-foreground">
              {item.detail}
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-muted-foreground">None.</p>
    )}
  </div>
);

const DocumentStatusBadge = ({ status }: { status: DocumentStatus }) => (
  <Badge
    variant={statusVariant(status)}
    className="inline-flex max-w-full items-center gap-1"
  >
    {status === "processing" ? (
      <Loader2 className="size-3 animate-spin" aria-hidden="true" />
    ) : null}
    <span className="truncate">{statusLabel[status]}</span>
  </Badge>
);

const DocumentActionsMenu = ({
  document,
  isProcessingRequestPending,
  isDeletePending,
  onProcess,
  onDelete,
}: {
  document: DocumentListSummary;
  isProcessingRequestPending: boolean;
  isDeletePending: boolean;
  onProcess: (documentId: string) => void;
  onDelete: (document: DocumentListSummary) => void;
}) => {
  const canProcess =
    document.status === "imported" || document.status === "needs_review";
  const isRetry = document.status === "needs_review";
  const ProcessIcon = isRetry ? RotateCcw : Play;
  const processLabel = isRetry ? "Re-process" : "Process";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label={`Actions for ${document.originalFileName}`}
          disabled={isDeletePending}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {canProcess ? (
          <DropdownMenuItem
            disabled={isProcessingRequestPending}
            onSelect={() => onProcess(document.id)}
          >
            <ProcessIcon className="size-4" />
            {processLabel}
          </DropdownMenuItem>
        ) : null}
        {canProcess ? <DropdownMenuSeparator /> : null}
        <DropdownMenuItem
          variant="destructive"
          disabled={isDeletePending}
          onSelect={() => onDelete(document)}
        >
          <Trash2 className="size-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

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
  const revalidator = useRevalidator();
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(
    null,
  );
  const [deleteRequestId, setDeleteRequestId] = useState<string | null>(null);

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

  const handleProcessDocument = async (documentId: string) => {
    setProcessingRequestId(documentId);

    try {
      await window.deductions.processing.processDocument(documentId);
      revalidator.revalidate();
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleDeleteDocument = async (document: DocumentListSummary) => {
    const confirmed = window.confirm(
      `Delete "${document.originalFileName}"?\n\nThis permanently deletes the document and its ${pluralize(
        document.invoiceCount,
        "invoice",
      )} with ${pluralize(document.invoiceItemCount, "invoice item")}.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteRequestId(document.id);

    try {
      await window.deductions.data.deleteDocument(document.id);
      revalidator.revalidate();
    } finally {
      setDeleteRequestId(null);
    }
  };

  const documentCount = documents.length;

  return (
    <main className="min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {pluralize(documentCount, "imported document")} in the active profile.
        </p>
      </div>
      <LatestImportSummary result={latestImport} />
      <div className="min-w-0">
        <section className="min-w-0 overflow-hidden rounded-md border bg-card">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[27%] whitespace-normal">
                  File name
                </TableHead>
                <TableHead className="w-[13%] whitespace-normal">
                  Source
                </TableHead>
                <TableHead className="w-[16%] whitespace-normal">
                  Imported
                </TableHead>
                <TableHead className="w-[15%] whitespace-normal">
                  Status
                </TableHead>
                <TableHead className="w-[7%] whitespace-normal text-right">
                  Items
                </TableHead>
                <TableHead className="w-[8%] whitespace-normal">
                  Tax year
                </TableHead>
                <TableHead className="w-16 whitespace-normal text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length > 0 ? (
                documents.map((document) => {
                  const isNew = acceptedDocumentIds.has(document.id);

                  return (
                    <ReviewTableRow
                      key={document.id}
                      className={isNew ? "bg-emerald-50/60" : undefined}
                      to={documentPath(document.id)}
                    >
                      <TableCell className="whitespace-normal wrap-break-word font-medium">
                        {document.originalFileName}
                      </TableCell>
                      <TableCell className="whitespace-normal wrap-break-word">
                        {document.sourceLabel}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {formatDateTime(document.importedAt)}
                      </TableCell>
                      <TableCell>
                        <DocumentStatusBadge status={document.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {document.invoiceItemCount}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {document.taxYears.length > 0
                          ? document.taxYears.join(", ")
                          : "None"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DocumentActionsMenu
                          document={document}
                          isProcessingRequestPending={
                            processingRequestId === document.id
                          }
                          isDeletePending={deleteRequestId === document.id}
                          onProcess={handleProcessDocument}
                          onDelete={handleDeleteDocument}
                        />
                      </TableCell>
                    </ReviewTableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No imported documents.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </div>
    </main>
  );
};
