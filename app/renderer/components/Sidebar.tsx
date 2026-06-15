import { Link } from "react-router";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  CalendarDays,
  ChevronRight,
  FileText,
  Library,
} from "lucide-react";

import type { TaxYearSummary } from "../../shared/data";
import { documentsPath, reviewQueuePath, taxYearPath } from "@/navigation";
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
  taxYears: TaxYearSummary[];
};

const inactiveButtonClassName =
  "data-[active=false]:bg-transparent data-[active=false]:font-normal data-[active=false]:text-sidebar-foreground";
const countBadgeClassName = "right-1.5 text-sidebar-foreground/60";

const getLatestYear = (taxYears: TaxYearSummary[]) =>
  taxYears.reduce<number | undefined>(
    (latest, taxYear) =>
      typeof latest === "number" ? Math.max(latest, taxYear.year) : taxYear.year,
    undefined,
  );

const getOpenYearForPath = (
  locationPathname: string,
  taxYears: TaxYearSummary[],
) => {
  const yearMatch = locationPathname.match(/^\/years\/(\d{4})(?:\/|$)/);
  const routeYear = yearMatch ? Number(yearMatch[1]) : undefined;

  if (taxYears.some((taxYear) => taxYear.year === routeYear)) {
    return routeYear;
  }

  return getLatestYear(taxYears);
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
  taxYears,
}: AppSidebarProps) => {
  const selectedOpenYear = getOpenYearForPath(locationPathname, taxYears);
  const [openYear, setOpenYear] = useState<number | undefined>(
    selectedOpenYear,
  );

  useEffect(() => {
    setOpenYear(selectedOpenYear);
  }, [selectedOpenYear]);

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
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink
                to="/"
                label="All years"
                icon={<Library />}
                isActive={locationPathname === "/"}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Tax years</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {taxYears.map((year) => {
                const yearPath = taxYearPath(year.year);
                const isYearOpen = openYear === year.year;

                return (
                  <Collapsible
                    key={year.year}
                    asChild
                    className="group/collapsible"
                    open={isYearOpen}
                    onOpenChange={(isOpen) => {
                      if (isOpen || openYear !== year.year) {
                        setOpenYear(year.year);
                      }
                    }}
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
                                <span>Overview</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuButton
                              asChild
                              className={`${inactiveButtonClassName} pr-8`}
                              isActive={
                                locationPathname ===
                                reviewQueuePath(year.year, "pending")
                              }
                            >
                              <Link to={reviewQueuePath(year.year, "pending")}>
                                <span>Review</span>
                              </Link>
                            </SidebarMenuButton>
                            {year.counts.pending > 0 ? (
                              <SidebarMenuBadge className={countBadgeClassName}>
                                {year.counts.pending}
                              </SidebarMenuBadge>
                            ) : null}
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuButton
                              asChild
                              className={`${inactiveButtonClassName} pr-8`}
                              isActive={
                                locationPathname ===
                                reviewQueuePath(year.year, "accepted")
                              }
                            >
                              <Link to={reviewQueuePath(year.year, "accepted")}>
                                <span>Accepted</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuButton
                              asChild
                              className={`${inactiveButtonClassName} pr-8`}
                              isActive={
                                locationPathname ===
                                reviewQueuePath(year.year, "rejected")
                              }
                            >
                              <Link to={reviewQueuePath(year.year, "rejected")}>
                                <span>Rejected</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuSubItem>
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
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarLink
                to={documentsPath()}
                label="Documents"
                icon={<FileText />}
                isActive={locationPathname === documentsPath()}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
