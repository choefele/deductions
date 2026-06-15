import { Link } from "react-router";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  FileQuestion,
  Inbox,
  Server,
} from "lucide-react";

import type { SourceSummary, TaxYearSummary } from "../../shared/deductions";
import { categoryPath, reviewQueuePath, taxYearPath } from "@/navigation";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
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
  SidebarMenuSubItem,
  SidebarSeparator,
} from "./ui/sidebar";

type AppSidebarProps = {
  locationPathname: string;
  sources: SourceSummary[];
  taxYears: TaxYearSummary[];
};

const inactiveButtonClassName =
  "data-[active=false]:bg-transparent data-[active=false]:font-normal data-[active=false]:text-sidebar-foreground";
const countBadgeClassName = "right-1.5 text-sidebar-foreground/60";

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
    <SidebarMenuButton
      asChild
      className={inactiveButtonClassName}
      isActive={isActive}
      tooltip={label}
    >
      <Link to={to}>
        {icon}
        <span>{label}</span>
      </Link>
    </SidebarMenuButton>
    {typeof badge === "number" ? (
      <SidebarMenuBadge className={countBadgeClassName}>
        {badge}
      </SidebarMenuBadge>
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
      accepted: counts.accepted + year.counts.accepted,
      rejected: counts.rejected + year.counts.rejected,
    }),
    { pending: 0, accepted: 0, rejected: 0 },
  );

  return (
    <Sidebar
      aria-label="Primary navigation"
      collapsible="offcanvas"
      role="complementary"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className={inactiveButtonClassName}
              size="lg"
              tooltip="Christian Neef"
            >
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
                to={reviewQueuePath("pending")}
                label="Pending review"
                icon={<Inbox />}
                badge={allCounts.pending}
                isActive={locationPathname === reviewQueuePath("pending")}
              />
              <SidebarLink
                to={reviewQueuePath("accepted")}
                label="Accepted"
                icon={<FileQuestion />}
                badge={allCounts.accepted}
                isActive={locationPathname === reviewQueuePath("accepted")}
              />
              <SidebarLink
                to={reviewQueuePath("rejected")}
                label="Rejected"
                icon={<FileQuestion />}
                badge={allCounts.rejected}
                isActive={locationPathname === reviewQueuePath("rejected")}
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
                    className="group/collapsible"
                    defaultOpen={isYearOpen || index === 0}
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          className={inactiveButtonClassName}
                          tooltip={String(year.year)}
                        >
                          <CalendarDays />
                          <span>{year.year}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="mx-0 border-l-0 px-0 pl-6">
                          <SidebarMenuSubItem>
                            <SidebarMenuButton
                              asChild
                              className={`${inactiveButtonClassName} pr-8`}
                              isActive={locationPathname === yearPath}
                            >
                              <Link to={yearPath}>
                                <span>Dashboard</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuSubItem>
                          {year.categories.map(({ category, total }) => (
                            <SidebarMenuSubItem
                              key={`${year.year}-${category.id}`}
                            >
                              <SidebarMenuButton
                                asChild
                                className={`${inactiveButtonClassName} pr-8`}
                                isActive={
                                  locationPathname ===
                                  categoryPath(year.year, category.id)
                                }
                              >
                                <Link to={categoryPath(year.year, category.id)}>
                                  <span>{category.label}</span>
                                </Link>
                              </SidebarMenuButton>
                              <SidebarMenuBadge className={countBadgeClassName}>
                                {total}
                              </SidebarMenuBadge>
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
                badge={sources.reduce(
                  (total, source) => total + source.invoiceItemCount,
                  0,
                )}
                isActive={locationPathname === "/sources"}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
