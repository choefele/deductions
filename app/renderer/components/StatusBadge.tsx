import type { ReviewStatus } from '../../shared/deductions';
import { Badge } from './ui/badge';

export const StatusBadge = ({ status }: { status: ReviewStatus }) => {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">
          Pending
        </Badge>
      );
    case 'accepted':
      return (
        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
          Accepted
        </Badge>
      );
    case 'rejected':
      return <Badge variant="secondary">Rejected</Badge>;
  }
};
