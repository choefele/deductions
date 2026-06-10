import { useLoaderData } from 'react-router';
import { Server } from 'lucide-react';

import type { SourceId } from '@/data/deductionRepository';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export const SourcesView = () => {
  const sources = useLoaderData() as Array<{
    id: SourceId;
    label: string;
    count: number;
  }>;

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
                {source.count} invoice{source.count === 1 ? '' : 's'} in mock data.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {source.id === 'manual-upload'
                ? 'Use Import invoice in the header to select files.'
                : 'Connected source setup is deferred.'}
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};
