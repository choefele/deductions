import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, LoaderCircle, XCircle } from 'lucide-react';
import { Dialog } from 'radix-ui';

import type {
  ExportInvoicesResult,
  ExportYearOption,
} from '../../shared/exports';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';

type ExportInvoicesDialogProps = {
  currentYear?: number;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
});

const defaultSelectedYears = (
  options: ExportYearOption[],
  currentYear?: number,
) => {
  const current = options.find(
    (option) => option.year === currentYear && option.includedItemCount > 0,
  );

  return new Set([current?.year ?? options[0]?.year].filter(Boolean) as number[]);
};

export const ExportInvoicesDialog = ({
  currentYear,
}: ExportInvoicesDialogProps) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ExportYearOption[]>([]);
  const [selectedYears, setSelectedYears] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportInvoicesResult | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    setIsLoading(true);
    setError(null);
    setResult(null);

    window.deductions.exports
      .listExportYearOptions()
      .then((loadedOptions) => {
        if (!active) {
          return;
        }

        setOptions(loadedOptions);
        setSelectedYears(defaultSelectedYears(loadedOptions, currentYear));
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Could not load export options.',
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [currentYear, open]);

  const selectedYearList = useMemo(
    () => [...selectedYears].sort((left, right) => right - left),
    [selectedYears],
  );

  const toggleYear = (year: number) => {
    setSelectedYears((current) => {
      const next = new Set(current);

      if (next.has(year)) {
        next.delete(year);
      } else {
        next.add(year);
      }

      return next;
    });
  };

  const exportInvoices = async () => {
    setIsExporting(true);
    setError(null);
    setResult(null);

    try {
      const exportResult = await window.deductions.exports.exportInvoices({
        years: selectedYearList,
      });

      if (
        !exportResult.canceled &&
        exportResult.results.length > 0 &&
        exportResult.results.every((yearResult) => yearResult.status === 'created')
      ) {
        setOpen(false);
        return;
      }

      setResult({
        ...exportResult,
        results: exportResult.results.filter(
          (yearResult) => yearResult.status !== 'created',
        ),
      });
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : 'Could not create export package.',
      );
    } finally {
      setIsExporting(false);
    }
  };

  const hasOptions = options.length > 0;
  const canExport =
    selectedYearList.length > 0 && !isLoading && !isExporting && hasOptions;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button className="shadow-sm">
          <Download />
          Export
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85vh] w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-background shadow-xl">
          <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
            <div>
              <Dialog.Title className="text-base font-semibold">
                Export invoices
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                Create ZIP packages with spreadsheet data and proof documents.
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Close export dialog">
                <XCircle />
              </Button>
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isLoading ? (
              <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading exportable years
              </div>
            ) : null}

            {!isLoading && !hasOptions ? (
              <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
                No accepted or in-review invoice items are available for export.
              </div>
            ) : null}

            {!isLoading && hasOptions ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12" />
                    <TableHead>Year</TableHead>
                    <TableHead className="text-right">Accepted</TableHead>
                    <TableHead className="text-right">In review</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {options.map((option) => (
                    <TableRow key={option.year}>
                      <TableCell>
                        <input
                          aria-label={`Export ${option.year}`}
                          checked={selectedYears.has(option.year)}
                          className="size-4 accent-primary"
                          disabled={option.includedItemCount === 0 || isExporting}
                          type="checkbox"
                          onChange={() => toggleYear(option.year)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{option.year}</TableCell>
                      <TableCell className="text-right">
                        {option.acceptedItemCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {option.inReviewItemCount}
                      </TableCell>
                      <TableCell className="text-right">
                        {currencyFormatter.format(option.includedAmount)}
                      </TableCell>
                      <TableCell>
                        {option.issueCount > 0 ? (
                          <Badge variant="destructive">
                            <AlertTriangle />
                            {option.issueCount}
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <CheckCircle2 />
                            Ready
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {result && !result.canceled && result.results.length > 0 ? (
              <div className="mt-4 space-y-2">
                {result.results.map((yearResult) => (
                  <div
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm"
                    key={yearResult.year}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{yearResult.year}</span>
                      <Badge variant="destructive">
                        {yearResult.status}
                      </Badge>
                    </div>
                    {yearResult.message ? (
                      <div className="mt-1 text-muted-foreground">
                        {yearResult.message}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t px-5 py-4">
            <Dialog.Close asChild>
              <Button variant="outline">Close</Button>
            </Dialog.Close>
            <Button disabled={!canExport} onClick={exportInvoices}>
              {isExporting ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Download />
              )}
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
