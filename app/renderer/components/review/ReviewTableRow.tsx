import type { KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';
import { TableRow } from '@/components/ui/table';

type ReviewTableRowProps = {
  to: string;
  children: ReactNode;
  className?: string;
};

const isInteractiveTarget = (target: EventTarget | null) =>
  target instanceof Element &&
  target.closest(
    'a, button, input, select, textarea, [contenteditable="true"], [role="menuitem"]',
  ) !== null;

export const ReviewTableRow = ({
  to,
  children,
  className,
}: ReviewTableRowProps) => {
  const navigate = useNavigate();

  const handleKeyDown: KeyboardEventHandler<HTMLTableRowElement> = (event) => {
    if (isInteractiveTarget(event.target)) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigate(to);
    }
  };

  const handleClick: MouseEventHandler<HTMLTableRowElement> = (event) => {
    if (!isInteractiveTarget(event.target)) {
      navigate(to);
    }
  };

  return (
    <TableRow
      tabIndex={0}
      className={cn(
        'cursor-pointer focus-visible:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        className,
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {children}
    </TableRow>
  );
};
