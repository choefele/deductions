import { Link } from 'react-router';
import type { ReactNode } from 'react';
import {
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  FolderOpen,
  Home,
  Inbox,
  ReceiptText,
  Server,
  ShieldQuestion,
  TriangleAlert,
} from 'lucide-react';

import type {
  SourceId,
  TaxCategory,
  TaxYearSummary,
} from '@/data/deductionRepository';
import { categoryPath, reviewQueuePath, taxYearPath } from '@/navigation';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from './ui/sidebar';

type AppSidebarProps = {
  locationPathname: string;
  sources: Array<{ id: SourceId; label: string; count: number }>;
  taxYears: TaxYearSummary[];
};

const categoryIcon = (categoryId: TaxCategory['id']) => {
  switch (categoryId) {
    case 'work-related-expenses':
      return <ReceiptText />;
    case 'special-expenses':
      return <ClipboardCheck />;
    case 'extraordinary-burdens':
      return <ShieldQuestion />;
    case 'household-services':
      return <Home />;
    case 'tradesperson-services':
      return <FolderOpen />;
    case 'not-tax-relevant':
      return <FileQuestion />;
  }
};

const SidebarLink = ({
  to,
  label,
  icon,
  badge,
  isActive,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  isActive: boolean;
}) => (
  <SidebarMenuItem>
    <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
      <Link to={to}>
        {icon}
        <span>{label}</span>
      </Link>
    </SidebarMenuButton>
    {typeof badge === 'number' ? (
      <SidebarMenuBadge>{badge}</SidebarMenuBadge>
    ) : null}
  </SidebarMenuItem>
);

export const AppSidebar = ({
  locationPathname,
  sources,
  taxYears,
}: AppSidebarProps) => {
  const allCounts = taxYears.reduce(
    (counts, year) => ({
      pending: counts.pending + year.counts.pending,
      lowConfidence: counts.lowConfidence + year.counts.lowConfidence,
      consultantReview: counts.consultantReview + year.counts.consultantReview,
      exportIssues: counts.exportIssues + year.counts.exportIssues,
    }),
    { pending: 0, lowConfidence: 0, consultantReview: 0, exportIssues: 0 },
  );

  return (
    <Sidebar aria-label="Primary navigation" collapsible="icon" role="complementary">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Christian Neef">
              <Link to="/">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">CN</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0 flex-1 text-left">
                  <span className="truncate text-sm font-medium">
                    Christian Neef
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    Personal tax archive
                  </span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Review</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink
                to={reviewQueuePath('pending')}
                label="Pending review"
                icon={<Inbox />}
                badge={allCounts.pending}
                isActive={locationPathname === reviewQueuePath('pending')}
              />
              <SidebarLink
                to={reviewQueuePath('low-confidence')}
                label="Low confidence"
                icon={<TriangleAlert />}
                badge={allCounts.lowConfidence}
                isActive={locationPathname === reviewQueuePath('low-confidence')}
              />
              <SidebarLink
                to={reviewQueuePath('consultant-review')}
                label="Consultant review"
                icon={<ShieldQuestion />}
                badge={allCounts.consultantReview}
                isActive={
                  locationPathname === reviewQueuePath('consultant-review')
                }
              />
              <SidebarLink
                to={reviewQueuePath('export-issues')}
                label="Export issues"
                icon={<FileQuestion />}
                badge={allCounts.exportIssues}
                isActive={locationPathname === reviewQueuePath('export-issues')}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tax years</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {taxYears.map((year, index) => {
                const yearPath = taxYearPath(year.year);
                const isYearOpen = locationPathname.startsWith(yearPath);

                return (
                  <Collapsible
                    key={year.year}
                    asChild
                    defaultOpen={isYearOpen || index === 0}
                  >
                    <SidebarMenuItem>
                      <div className="flex items-center">
                        <SidebarMenuButton
                          asChild
                          isActive={locationPathname === yearPath}
                          tooltip={String(year.year)}
                        >
                          <Link to={yearPath}>
                            <CalendarDays />
                            <span>{year.year}</span>
                          </Link>
                        </SidebarMenuButton>
                        <SidebarMenuBadge>{year.total}</SidebarMenuBadge>
                        <CollapsibleTrigger className="absolute right-1.5 flex size-5 items-center justify-center rounded-md text-sidebar-foreground/70 outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden [&[data-state=open]>svg]:rotate-90">
                          <ChevronRight className="size-4 transition-transform" />
                          <span className="sr-only">Toggle {year.year}</span>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {year.categories.map(({ category, total }) => (
                            <SidebarMenuSubItem
                              key={`${year.year}-${category.id}`}
                            >
                              <SidebarMenuSubButton
                                asChild
                                isActive={
                                  locationPathname ===
                                  categoryPath(year.year, category.id)
                                }
                              >
                                <Link to={categoryPath(year.year, category.id)}>
                                  {categoryIcon(category.id)}
                                  <span>{category.label}</span>
                                </Link>
                              </SidebarMenuSubButton>
                              <span className="absolute right-1 top-1 text-xs text-sidebar-foreground/60">
                                {total}
                              </span>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Sources</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink
                to="/sources"
                label="Sources"
                icon={<Server />}
                badge={sources.reduce((total, source) => total + source.count, 0)}
                isActive={locationPathname === '/sources'}
              />
            </SidebarMenu>
            <div className="px-2 pt-2 group-data-[collapsible=icon]:hidden">
              <Badge variant="secondary">Manual uploads first</Badge>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
};
