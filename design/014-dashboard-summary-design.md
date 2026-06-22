# Dashboard Summary Design: All Years and Year Overview

Status: proposed for review. This is a design and implementation plan only; it does not change the application.

## Purpose

Replace the current count-and-category dashboards with one consistent, glanceable dashboard pattern:

- show accepted and in-review money totals;
- distinguish it from money still awaiting review;
- show the number of items in each review status;
- make each status count the direct way to open that status queue; and
- use the same visual hierarchy for the All Years dashboard and an individual year's Overview.

The dashboards are collection and review summaries, not tax calculations. They must not imply that the displayed amount is a final tax saving, refund, or guaranteed deductible amount.

## Decisions

### Terminology

The stored `pending` review status is labelled **Review** in the dashboard. This matches the navigation and describes the user's next action better than "pending."

| UI term | Stored status | Meaning |
| --- | --- | --- |
| Review | `pending` | An item has not yet been decided and is not currently included in the deductible total. |
| Accepted | `accepted` | An item is currently included in the deductible total. |
| Rejected | `rejected` | An item is excluded from the deductible total. |

### Money definition

The primary money figure is **Accepted total**:

```text
accepted amount
```

The secondary figure is **Accepted + in-review total**:

```text
accepted amount + review amount
```

The secondary figure is intentionally not named "deductible" on its own. Its supporting text must state the exact review amount included, for example: `Includes €240.00 from 3 items still in review.` Rejected amounts are excluded from both figures.

This communicates the useful upside without suggesting that undecided items have already been accepted.

### Navigation decision

Status counts are the status buttons. A count card is a full-card link, not a static metric plus a separate action button.

- On a year Overview, the three cards link to that year's Review, Accepted, and Rejected queues.
- On All Years, every year row exposes the same three linked status cards, each opening the relevant queue for that year.
- The all-years aggregate is summary-only. No global status queue is introduced in this change because the existing information architecture only has year-scoped review queues. This avoids adding a new route and queue behaviour without a defined need.

## Shared Dashboard Pattern

Both dashboards use the same ordered sections.

1. Page heading and a compact scope label (`All years` or the tax year).
2. A **Money** summary card with the current and including-review values.
3. An **Items by status** group of three interactive status cards: Review, Accepted, Rejected.
4. A scope-specific list:
   - All Years: one compact dashboard row per tax year.
   - Year Overview: no categories; the dashboard ends after the summary sections.

Money is visually first because it answers the highest-level question: "What is currently ready for my tax handover?" Status counts immediately follow because they show workload and provide the next action.

### Shared summary block

```text
+----------------------------------------------------------------+
| Money                                                          |
| Accepted total                                                 |
| €1,240.00                                                      |
|                                                                |
| Accepted + in-review total                                     |
| €1,480.00                                                      |
| Includes €240.00 from 3 items still in review.                |
+----------------------------------------------------------------+

Items by status
+--------------------+ +--------------------+ +--------------------+
| Review             | | Accepted           | | Rejected           |
| 3 items        ->  | | 12 items       ->  | | 2 items        ->  |
| Needs a decision   | | Currently included | | Excluded           |
+--------------------+ +--------------------+ +--------------------+
```

The `->` represents the whole-card link affordance, not visible text. Keep the existing visual language: neutral cards, a muted border, hover state, and status icons. Do not make the dashboard depend on colour alone; card title, explanatory text, and count remain the primary signals.

### Responsive behaviour

- Wide screens: Money and status cards can sit in a two-column dashboard grid, with the three status cards arranged side by side.
- Medium screens: the money card spans the row; status cards remain a three-column grid where space permits.
- Narrow screens: money values stack inside their card and status cards stack vertically. Each remains a large, easily tappable link.
- Preserve the existing main-content padding and avoid horizontal scrolling.

## Year Overview

Route: `/years/:year`.

### Content

Use the shared dashboard pattern with the tax year as scope:

```text
2025 overview
See what is ready now and what still needs a decision.

[ shared Money summary ]

Items by status
[ Review: 3 ] [ Accepted: 12 ] [ Rejected: 2 ]
```

Remove the disabled **Export** button from this route. Export remains available through the existing dedicated export control; the dashboard should not repeat an inactive action.

### Status-card destinations

| Card | Destination |
| --- | --- |
| Review | `/years/:year/review` |
| Accepted | `/years/:year/accepted` |
| Rejected | `/years/:year/rejected` |

Cards remain links when their count is zero. The empty queue can then explain that there are no items in that state; this gives the three destinations stable, predictable access.

### Removed content

Remove the **Categories** dashboard card and the separate **Next actions** card from this route.

This only removes categories from the Overview dashboard. It does not remove category data, category routes, invoice editing, or any future category-oriented workflow. Existing category routes may remain available until their navigation and product purpose are separately reviewed.

## All Years Dashboard

Route: `/`.

### Content

Use the same heading, shared Money summary, and status terminology at the all-years scope. Under it, show **By tax year** rather than the current simple year list and separate Recent items card.

```text
All years
See accepted totals and what needs review.

[ shared all-years Money summary ]

By tax year
+----------------------------------------------------------------+
| 2025                                                     [->]  |
| Accepted total  €1,240.00             + €240.00 in review      |
| [ Review 3 -> ] [ Accepted 12 -> ] [ Rejected 2 -> ]          |
+----------------------------------------------------------------+
| 2024                                                     [->]  |
| Accepted total    €680.00             + €0.00 in review        |
| [ Review 0 -> ] [ Accepted 5 -> ] [ Rejected 1 -> ]           |
+----------------------------------------------------------------+
```

Each year row is a compact instance of the same summary pattern:

- the year label and non-status area link to that year's Overview;
- its primary money line shows the accepted amount;
- its review annotation shows the pending amount, or `No items in review` when it is zero;
- its three status cards link directly to the respective year queue.

Do not nest links. Implement the row's year/arrow link separately from the three full-card status links.

### Recent items

Remove the **Recent items** card from All Years as part of this focused dashboard. It competes with the money and review-state summary and does not answer either primary dashboard question. Recent-item access remains available through the year queues and document flows.

### Empty state

If there are no tax years, display the standard page heading and an empty-state card: `No invoice items yet. Import and process a document to start building your tax-year summary.` Do not render zero-value money or empty status-card grids without context.

## Data Contract and Aggregation

### New summary value

Add an amount summary to the existing summary contract. Keep internal aggregation in cents and only convert to the existing decimal display amount at the API boundary.

```ts
type AmountSummary = {
  accepted: number;
  pending: number;
};

type TaxYearSummary = {
  year: number;
  total: number;
  counts: CountSummary;
  amounts: AmountSummary;
  categories: CategorySummary[];
};

type AllYearsSummary = {
  years: TaxYearSummary[];
  counts: CountSummary;
  amounts: AmountSummary;
  recentInvoiceItems: InvoiceItemSummary[];
};
```

The existing `total`, `categories`, and `recentInvoiceItems` fields need not be removed from the shared contract in this change. The two dashboard views simply stop consuming the fields no longer shown. This keeps the dashboard change narrow and avoids accidental breakage in the sidebar, routes, or other consumers.

Derived display values must be calculated from this contract, not persisted:

```text
currentlyDeductible = amounts.accepted
includingReview = amounts.accepted + amounts.pending
```

`rejected` money is intentionally omitted from `AmountSummary`; it has no dashboard role under the agreed money definition.

### Repository work

In `SqliteDeductionsData`:

1. Add an aggregate query that groups invoice items by `reviewStatus` and sums `invoiceItems.amountCents`.
2. Apply the same optional `where` condition used by `countSummary`, so it works for a single tax year and the all-years total.
3. Return zero for statuses with no rows.
4. Convert cents to decimal amounts once when creating `AmountSummary`.
5. Reuse it from `buildTaxYearSummary()` and `getAllYearsSummary()`.

All existing data is EUR-only, so a single EUR formatted figure is valid. If multi-currency support is introduced later, this contract must change to amounts grouped by currency before displaying totals; never add unlike currencies together.

## Renderer Structure

Implement the shared presentation as dashboard-focused components rather than duplicating card markup in the two views.

Suggested components:

| Component | Responsibility |
| --- | --- |
| `MoneySummaryCard` | Shows accepted and accepted-plus-review totals with an explicit pending annotation. |
| `StatusSummaryCards` | Renders Review, Accepted, and Rejected count cards; accepts queue destinations for a year. |
| `YearDashboardRow` | Renders one All Years row with its overview link, money line, and `StatusSummaryCards`. |

`TaxYearDashboard` composes `MoneySummaryCard` and `StatusSummaryCards`. `AllYearsDashboard` composes `MoneySummaryCard` with `YearDashboardRow` instances. This keeps labels, descriptions, icons, zero behaviour, and click targets consistent.

Use the existing `formatCurrency` helper. Add small, testable helpers for `includingReview` and the review annotation only if they improve readability; avoid recreating aggregate logic in the renderer.

## Accessibility and Interaction Requirements

- Each status card is a semantic link with an accessible name that includes state, count, and year where relevant, for example `Review: 3 items for 2025`.
- The card's hover and keyboard-focus styles must be visible.
- Status icons are decorative when adjacent text already states the status; they should not create duplicate screen-reader labels.
- Do not rely on red/green status colour to convey accepted or rejected.
- Amounts use the existing locale-aware currency formatter.
- Card descriptions clearly distinguish current accepted money from pending review money at all viewport sizes.

## Implementation Sequence

1. Extend shared summary types with `AmountSummary` and update affected fixtures/mocks.
2. Add repository amount aggregation in cents and populate both all-years and tax-year summaries.
3. Add unit coverage for amounts, zero-status handling, and tax-year filtering.
4. Create the shared dashboard components and replace the current count-card layouts.
5. Remove the disabled Export button, Categories, and Next actions from the year Overview; remove Recent items from All Years.
6. Add renderer tests for card destinations and copy, then update the Electron smoke test if it asserts prior dashboard text or structure.
7. Run `npx tsc --noEmit`, `npm test`, `npm run lint`, and the relevant Electron end-to-end coverage.

No database migration is needed: the amounts already exist in `invoice_items.amount_cents`.

## Acceptance Criteria

- All Years and a year Overview both present the same money-first, status-second dashboard pattern.
- The primary money amount equals the sum of accepted item amounts only.
- The secondary money amount equals accepted plus review item amounts and explicitly states the review contribution.
- Rejected items are excluded from both displayed money amounts.
- Review, Accepted, and Rejected item counts are visible and their cards navigate to the correct year-scoped queues.
- All Years is grouped by year, and each year exposes its own three queue links.
- Categories no longer appear on the year Overview.
- Separate Next actions and Recent items cards no longer dilute the dashboard summary.
- Zero-count status cards, empty years, narrow layouts, and keyboard navigation remain usable.
- Existing summary-count, queue, and navigation behaviour continues to work.

## Out of Scope

- Tax-saving, refund, or tax-liability calculations.
- Changes to export eligibility or the existing dedicated export control.
- A cross-year Review, Accepted, or Rejected queue.
- Removing category routes or category editing from invoice review.
- Multi-currency totals.
- Changes to imported data or database schema.
