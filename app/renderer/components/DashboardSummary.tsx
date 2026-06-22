import { Link } from 'react-router';
import { ArrowRight, CheckCircle2, Inbox, XCircle } from 'lucide-react';

import type { AmountSummary, CountSummary, ReviewStatus } from '../../shared/data';
import { reviewQueuePath, taxYearPath } from '@/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { formatCurrency } from '@/views/viewUtils';

type MoneySummaryCardProps = {
  amounts: AmountSummary;
  counts: CountSummary;
};

const itemLabel = (count: number) => (count === 1 ? 'item' : 'items');

export const MoneySummaryCard = ({
  amounts,
  counts,
}: MoneySummaryCardProps) => {
  const includingReview = amounts.accepted + amounts.pending;
  const reviewAnnotation =
    counts.pending > 0
      ? `Includes ${formatCurrency(amounts.pending)} from ${counts.pending} ${itemLabel(counts.pending)} still in review.`
      : 'No items are currently in review.';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Money</CardTitle>
        <CardDescription>
          Amounts collected for your tax handover, not tax savings.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 sm:grid-cols-2">
        <div>
          <div className="text-sm text-muted-foreground">
            Accepted total
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight">
            {formatCurrency(amounts.accepted)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Accepted items</p>
        </div>
        <div className="border-t pt-5 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
          <div className="text-sm text-muted-foreground">
            Accepted + in-review total
          </div>
          <div className="mt-1 text-3xl font-semibold tracking-tight">
            {formatCurrency(includingReview)}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {reviewAnnotation}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

type StatusSummaryCardsProps = {
  year: number;
  counts: CountSummary;
};

const statusCards: Array<{
  status: ReviewStatus;
  label: string;
  description: string;
  Icon: typeof Inbox;
}> = [
  {
    status: 'pending',
    label: 'Review',
    description: 'Needs a decision',
    Icon: Inbox,
  },
  {
    status: 'accepted',
    label: 'Accepted',
    description: 'Currently included',
    Icon: CheckCircle2,
  },
  {
    status: 'rejected',
    label: 'Rejected',
    description: 'Excluded',
    Icon: XCircle,
  },
];

export const StatusSummaryCards = ({
  year,
  counts,
}: StatusSummaryCardsProps) => (
  <div className="grid gap-3 md:grid-cols-3">
    {statusCards.map(({ status, label, description, Icon }) => {
      const count = counts[status];

      return (
        <Link
          key={status}
          aria-label={`${label}: ${count} ${itemLabel(count)} for ${year}`}
          className="group rounded-lg border p-4 transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          to={reviewQueuePath(year, status)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="size-4" />
                {label}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            </div>
            <ArrowRight
              aria-hidden="true"
              className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </div>
          <div className="mt-4 text-2xl font-semibold">
            {count} {itemLabel(count)}
          </div>
        </Link>
      );
    })}
  </div>
);

type YearDashboardRowProps = {
  year: number;
  amounts: AmountSummary;
  counts: CountSummary;
};

export const YearDashboardRow = ({
  year,
  amounts,
  counts,
}: YearDashboardRowProps) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Link
          aria-label={`Open ${year} overview`}
          className="group inline-flex items-center gap-2 font-medium hover:underline"
          to={taxYearPath(year)}
        >
          {year}
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          />
        </Link>
        <div className="text-right text-sm text-muted-foreground">
          <div>
            Accepted total{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(amounts.accepted)}
            </span>
          </div>
          <div className="mt-1">
            {counts.pending > 0
              ? `+ ${formatCurrency(amounts.pending)} in review`
              : 'No items in review'}
          </div>
        </div>
      </div>
      <div className="mt-4">
        <StatusSummaryCards counts={counts} year={year} />
      </div>
    </CardContent>
  </Card>
);
