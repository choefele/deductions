import type { KeyboardEventHandler, ReactNode } from 'react';
import { useNavigate } from 'react-router';

import { cn } from '@/lib/utils';
import { TableRow } from '@/components/ui/table';

type ReviewTableRowProps = {
  to: string;
  children: ReactNode;
  className?: string;
};

export const ReviewTableRow = ({
  to,
  children,
  className,
}: ReviewTableRowProps) => {
  const navigate = useNavigate();

  const handleKeyDown: KeyboardEventHandler<HTMLTableRowElement> = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
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
      onClick={() => navigate(to)}
      onKeyDown={handleKeyDown}
    >
      {children}
    </TableRow>
  );
};
