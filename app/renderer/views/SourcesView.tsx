import { useLoaderData } from 'react-router';
import { Server } from 'lucide-react';

import type { SourceSummary } from '../../shared/data';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const SourcesView = () => {
  const sources = useLoaderData() as SourceSummary[];

  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manual uploads are available now. Connected sources are represented for the future workflow.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <Card key={source.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-4" />
                {source.label}
              </CardTitle>
              <CardDescription>
                {source.invoiceItemCount} item
                {source.invoiceItemCount === 1 ? '' : 's'} from{' '}
                {source.documentCount} document
                {source.documentCount === 1 ? '' : 's'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {source.kind === 'manual-upload'
                ? 'Use Import invoice in the header to select files.'
                : 'Connected source setup is deferred.'}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};
