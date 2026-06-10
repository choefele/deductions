import type { CountSummary } from '@/data/deductionRepository';

export const formatCurrency = (amount: number, currency = 'EUR') =>
  new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));

export const countCards = (counts: CountSummary) => [
  { label: 'Pending', value: counts.pending },
  { label: 'Accepted', value: counts.accepted },
  { label: 'Rejected', value: counts.rejected },
  { label: 'Low confidence', value: counts.lowConfidence },
  { label: 'Consultant review', value: counts.consultantReview },
  { label: 'Export issues', value: counts.exportIssues },
];
