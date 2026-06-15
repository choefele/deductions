import { Outlet, useLocation, useRouteLoaderData } from 'react-router';

import type { rootLoader } from '@/routeData';
import { MainHeader } from './MainHeader';
import { AppSidebar } from './Sidebar';
import { ScrollArea } from './ui/scroll-area';
import { SidebarInset, SidebarProvider } from './ui/sidebar';
import { TooltipProvider } from './ui/tooltip';

type RootData = Awaited<ReturnType<typeof rootLoader>>;

export const AppShell = () => {
  const rootData = useRouteLoaderData('root') as RootData;
  const location = useLocation();

  return (
    <TooltipProvider delayDuration={200}>
      <SidebarProvider>
        <AppSidebar
          locationPathname={location.pathname}
          taxYears={rootData.taxYears}
        />
        <SidebarInset>
          <MainHeader />
          <ScrollArea className="min-h-0 flex-1">
            <Outlet />
          </ScrollArea>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
};
