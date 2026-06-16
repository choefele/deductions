import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import {
  Outlet,
  useLocation,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import { FileUp } from 'lucide-react';

import type { ImportFilesResult } from '../../shared/imports';
import { documentsPath } from '@/navigation';
import type { rootLoader } from '@/routeData';
import { MainHeader } from './MainHeader';
import { AppSidebar } from './Sidebar';
import { ScrollArea } from './ui/scroll-area';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { TooltipProvider } from './ui/tooltip';

type RootData = Awaited<ReturnType<typeof rootLoader>>;

const hasDraggedFiles = (event: DragEvent) =>
  Array.from(event.dataTransfer.types).includes('Files');

const emptyDropResult = (): ImportFilesResult => ({
  canceled: false,
  filePaths: [],
  accepted: [],
  skipped: [],
  failed: [],
});

export const AppShell = () => {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragDepth = useRef(0);
  const rootData = useRouteLoaderData('root') as RootData;
  const location = useLocation();
  const navigate = useNavigate();
  const revalidator = useRevalidator();

  const showImportResult = useCallback((result: ImportFilesResult) => {
    navigate(documentsPath(), { state: result });
    revalidator.revalidate();
  }, [navigate, revalidator]);

  useEffect(
    () => window.deductions.imports.onImportCompleted(showImportResult),
    [showImportResult],
  );

  const handleDragEnter = (event: DragEvent) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth.current += 1;
    setIsDraggingFiles(true);
  };

  const handleDragOver = (event: DragEvent) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event: DragEvent) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    dragDepth.current = Math.max(0, dragDepth.current - 1);

    if (dragDepth.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleDrop = async (event: DragEvent) => {
    if (!hasDraggedFiles(event)) {
      return;
    }

    event.preventDefault();
    dragDepth.current = 0;
    setIsDraggingFiles(false);

    const droppedFiles = Array.from(event.dataTransfer.files).map((file) => ({
      file,
      filePath: window.deductions.imports.getPathForFile(file),
    }));
    const filePaths = droppedFiles
      .map((droppedFile) => droppedFile.filePath)
      .filter((filePath) => filePath.length > 0);

    const missingPathFailures = droppedFiles
      .filter((droppedFile) => droppedFile.filePath.length === 0)
      .map(({ file }) => ({
        filePath: '',
        originalFileName: file.name || 'Dropped file',
        reason: 'Dropped file path could not be read.',
      }));

    const result =
      filePaths.length > 0
        ? await window.deductions.imports.importFilePaths(filePaths)
        : emptyDropResult();

    showImportResult({
      ...result,
      failed: [...missingPathFailures, ...result.failed],
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider
        className="h-svh overflow-hidden"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <AppSidebar
          locationPathname={location.pathname}
          taxYears={rootData.taxYears}
        />
        <SidebarInset className="min-h-0 min-w-0">
          <MainHeader />
          <ScrollArea className="min-h-0 flex-1 overflow-hidden">
            <Outlet />
          </ScrollArea>
        </SidebarInset>
        {isDraggingFiles ? (
          <div className="fixed inset-0 z-50 grid place-items-center border-2 border-dashed border-primary bg-background/85">
            <div className="flex items-center gap-3 rounded-md border bg-background px-5 py-3 text-sm font-medium shadow-sm">
              <FileUp className="size-4" />
              Drop PDFs to import
            </div>
          </div>
        ) : null}
      </SidebarProvider>
    </TooltipProvider>
  );
};
