import type { Confidence, ReviewFlag, ReviewStatus } from '@/data/deductionRepository';
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

export const ConfidenceBadge = ({ confidence }: { confidence: Confidence }) => {
  switch (confidence) {
    case 'high':
      return (
        <Badge className="bg-emerald-50 text-emerald-800 hover:bg-emerald-50">
          High confidence
        </Badge>
      );
    case 'medium':
      return <Badge variant="secondary">Medium confidence</Badge>;
    case 'low':
      return (
        <Badge className="bg-amber-50 text-amber-800 hover:bg-amber-50">
          Low confidence
        </Badge>
      );
  }
};

export const FlagBadge = ({ flag }: { flag: ReviewFlag }) => {
  switch (flag) {
    case 'needs-consultant-review':
      return <Badge variant="outline">Consultant review</Badge>;
    case 'export-issue':
      return <Badge variant="destructive">Export issue</Badge>;
  }
};
