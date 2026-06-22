import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

type ReviewDetailShellProps = {
  backLabel: string;
  backTo: string;
  positionLabel?: string;
  title: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  previousTo?: string | null;
  nextTo?: string | null;
  onPrevious?: () => void;
  onNext?: () => void;
  isPreviousDisabled?: boolean;
  isNextDisabled?: boolean;
  children: ReactNode;
};

export const ReviewDetailShell = ({
  backLabel,
  backTo,
  positionLabel,
  title,
  description,
  status,
  previousTo,
  nextTo,
  onPrevious,
  onNext,
  isPreviousDisabled,
  isNextDisabled,
  children,
}: ReviewDetailShellProps) => (
  <main className="min-w-0 space-y-6 p-6">
    <header className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" className="-ml-2">
          <Link to={backTo}>
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        </Button>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {positionLabel ? (
            <div className="text-sm text-muted-foreground">{positionLabel}</div>
          ) : null}
          <div className="flex items-center gap-1">
            {onPrevious || !previousTo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPreviousDisabled ?? !onPrevious}
                onClick={onPrevious}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to={previousTo}>
                  <ChevronLeft className="size-4" />
                  Previous
                </Link>
              </Button>
            )}
            {onNext || !nextTo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isNextDisabled ?? !onNext}
                onClick={onNext}
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            ) : (
              <Button asChild variant="outline" size="sm">
                <Link to={nextTo}>
                  Next
                  <ChevronRight className="size-4" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h1 className="wrap-break-word text-2xl font-semibold tracking-tight">
            {title}
          </h1>
          {description ? (
            <p className="wrap-break-word text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {status}
      </div>
    </header>
    {children}
  </main>
);
