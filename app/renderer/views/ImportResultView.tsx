import { Link, useLocation } from 'react-router';

import type { ImportFilesResult } from '../../shared/imports';
import { documentsPath } from '@/navigation';
import { formatSelectionStatus } from '@/selectionStatus';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const ImportResultView = () => {
  const location = useLocation();
  const result = location.state as ImportFilesResult | null;
  const selectedFiles = result && !result.canceled ? result.filePaths : [];
  const accepted = result?.accepted ?? [];
  const skipped = result?.skipped ?? [];
  const failed = result?.failed ?? [];
  const hasImportOutcomes =
    accepted.length + skipped.length + failed.length > 0;

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import result</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatSelectionStatus(result)}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {result?.canceled
              ? 'File selection canceled'
              : `${accepted.length} file${
                  accepted.length === 1 ? '' : 's'
                } imported`}
          </CardTitle>
          <CardDescription>
            Imported documents are stored in the active local profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasImportOutcomes ? (
            <div className="space-y-5 text-sm">
              {accepted.length > 0 ? (
                <section className="space-y-2">
                  <h2 className="font-medium">Imported</h2>
                  <ul className="space-y-2">
                    {accepted.map((file) => (
                      <li key={file.documentId} className="rounded-md border p-2">
                        <div className="font-medium">{file.originalFileName}</div>
                        <div className="text-muted-foreground">
                          {file.storagePath}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {skipped.length > 0 ? (
                <section className="space-y-2">
                  <h2 className="font-medium">Skipped</h2>
                  <ul className="space-y-2">
                    {skipped.map((file) => (
                      <li
                        key={`${file.filePath}-${file.existingDocumentId}`}
                        className="rounded-md border p-2"
                      >
                        <div className="font-medium">{file.originalFileName}</div>
                        <div className="text-muted-foreground">
                          Already imported.
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {failed.length > 0 ? (
                <section className="space-y-2">
                  <h2 className="font-medium">Failed</h2>
                  <ul className="space-y-2">
                    {failed.map((file) => (
                      <li key={file.filePath} className="rounded-md border p-2">
                        <div className="font-medium">{file.originalFileName}</div>
                        <div className="text-muted-foreground">{file.reason}</div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : selectedFiles.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {selectedFiles.map((filePath) => (
                <li key={filePath} className="rounded-md border p-2">
                  {filePath}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No files selected.</p>
          )}
          <Button asChild variant="secondary">
            <Link to={documentsPath()}>View documents</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
