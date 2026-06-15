import { useLoaderData } from 'react-router';
import { FileText } from 'lucide-react';

import type { SourceSummary } from '../../shared/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const DocumentsView = () => {
  const sources = useLoaderData() as SourceSummary[];
  const documentCount = sources.reduce(
    (total, source) => total + source.documentCount,
    0,
  );

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {documentCount} imported document
          {documentCount === 1 ? '' : 's'} in the active profile.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="size-4" />
                {source.label}
              </CardTitle>
              <CardDescription>
                {source.documentCount} document
                {source.documentCount === 1 ? '' : 's'} ·{' '}
                {source.invoiceItemCount} item
                {source.invoiceItemCount === 1 ? '' : 's'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Document-level issue tracking will appear here after processing
              status is available.
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};
