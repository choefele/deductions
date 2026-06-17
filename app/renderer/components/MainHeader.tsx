import { useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import { FileUp, Search } from 'lucide-react';

import { documentsPath, getBreadcrumbs, getSelectionForPath } from '@/navigation';
import type { rootLoader } from '@/routeData';
import { Breadcrumbs } from './Breadcrumbs';
import { ExportInvoicesDialog } from './ExportInvoicesDialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { SidebarTrigger } from './ui/sidebar';

type RootData = Awaited<ReturnType<typeof rootLoader>>;

export const MainHeader = () => {
  const [isImporting, setIsImporting] = useState(false);
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const location = useLocation();
  const rootData = useRouteLoaderData('root') as RootData;
  const selection = useMemo(
    () => getSelectionForPath(location.pathname, rootData.taxYears),
    [location.pathname, rootData.taxYears],
  );
  const breadcrumbs = getBreadcrumbs(selection);
  const currentYear =
    selection.type === 'tax-year' ||
    selection.type === 'tax-year-review-queue' ||
    selection.type === 'category'
      ? selection.year
      : selection.type === 'invoice'
        ? selection.invoice.taxYear
        : undefined;

  const handleImport = async () => {
    setIsImporting(true);

    try {
      const result = await window.deductions.imports.importFiles();
      navigate(documentsPath(), { state: result });
      revalidator.revalidate();
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <div className="hidden w-56 items-center gap-2 md:flex">
        <Search className="size-4 text-muted-foreground" />
        <Input
          aria-label="Search invoices"
          className="h-8"
          disabled
          placeholder="Search invoices"
        />
      </div>
      <Button
        className="shadow-sm"
        onClick={handleImport}
        disabled={isImporting}
      >
        <FileUp />
        {isImporting ? 'Importing...' : 'Import invoice'}
      </Button>
      <ExportInvoicesDialog currentYear={currentYear} />
    </header>
  );
};
