import { Link, useLocation } from 'react-router';

import type { OpenFilesResult } from '../../shared/ipc';
import { reviewQueuePath } from '@/navigation';
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
  const result = location.state as OpenFilesResult | null;
  const selectedFiles = result && !result.canceled ? result.filePaths : [];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import result</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This placeholder confirms the native file picker flow before real import processing exists.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {result?.canceled
              ? 'File selection canceled'
              : `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected`}
          </CardTitle>
          <CardDescription>
            Real invoice detection, duplicate checks, and extraction are deferred.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedFiles.length > 0 ? (
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
            <Link to={reviewQueuePath('pending')}>Review pending invoices</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};
