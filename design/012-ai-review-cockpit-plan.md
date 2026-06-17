# AI Review Cockpit Plan

Status: finalized for the first review implementation.

## Purpose

Plan a standout demo feature that turns extracted invoice drafts into a visible human-in-the-loop review workflow.

This plan builds on `004-user-story-map.md`, `005-main-ui-plan.md`, `010-document-processing-plan.md`, and `011-export-invoice-data-plan.md`. It assumes documents can already be imported and processed into invoice and invoice-item drafts, and that export packaging is available or in progress.

This is a design plan only. It does not implement schema, IPC, routing, renderer UI, document preview, or tests.

## Demo Promise

The demo should show this end-to-end story:

```text
Import invoice PDFs
  -> AI extracts invoice facts
  -> user reviews each item beside its source evidence
  -> user corrects fields, selects a category, accepts or rejects
  -> dashboard counts update
  -> export package reflects the reviewed decisions
```

The standout moment is not only that AI extracts data. The standout moment is that the app makes the extracted output inspectable, correctable, categorized, and ready for a tax consultant handover.

## Goals

- Let the user accept or reject pending invoice items.
- Let the user edit extracted invoice facts and review fields before accepting.
- Let the user select or correct the tax category for each item.
- Keep the original document or source context visible while reviewing.
- Make the difference between extracted facts, user decisions, and any later AI suggestions clear.
- Persist user edits so dashboards and exports use the reviewed data.
- Make the pending review queue feel like the main work surface for the demo.
- Keep wording conservative: the app suggests possible relevance, not final tax advice.

## Non-Goals

- Do not build a full tax filing assistant.
- Do not calculate tax savings, liability, or refunds.
- Do not add source integrations such as Amazon or email in this feature.
- Do not add OCR or image receipt extraction in the first slice.
- Do not add full audit history in the first slice.
- Do not require a settings UI for AI provider configuration.
- Do not block export on every pending item. Export can still include pending items, clearly marked as in review.

## Current Context

The existing app shape is close to this feature:

- `documents` tracks import and processing status.
- `invoices` stores vendor, invoice date, invoice number, and document linkage.
- `invoice_items` stores description, amount, tax year, category, review status, deduction reason, note, and sort order.
- Generated invoice items start as `pending`.
- Review queues and category views already list invoice items.
- `InvoiceDetailView` shows extracted facts and a review area, but the review actions are currently disabled.
- Export packaging includes accepted and pending items, so review decisions directly improve the handover package.

Automatic deduction-reason generation is not implemented yet. Treat category selection as the first tax-relevance decision and keep deduction reason as optional user-entered context until the AI parser supports it.

The main missing pieces are write APIs, editable review UI, category selection, and stronger evidence display.

## Final Scope

Build the first implementation around Slice 1. Treat Slice 2 and Slice 3 as follow-up work, not demo blockers.

### Slice 1: Editable Review Decisions

This is the committed first implementation slice.

Include:

- Edit invoice header fields:
  - vendor
  - invoice date
  - invoice number
- Edit invoice item fields:
  - description
  - amount
  - tax year
  - category
  - note
- Change review status:
  - `pending`
  - `accepted`
  - `rejected`
- Add primary actions:
  - `Accept`
  - `Reject`
  - `Save`
- Keep deduction reason optional and manually editable only if it already exists in the data.
- Update dashboard and queue data after a save.
- Keep a compact source panel visible with:
  - original file name
  - import metadata
  - link back to the document detail
  - document processing status

Avoid adding new database columns in this slice unless implementation discovers a hard requirement. Existing `invoices` and `invoice_items` columns cover the user-visible review output.

### Slice 2: Evidence-Aware Review

This is follow-up work after the first review implementation.

Include:

- Document preview or secure open-file action from the review detail page.
- Extracted text snippets or evidence lines for key fields.
- Low-confidence or "needs attention" markers.
- AI parser output that includes field evidence where supported.
- AI-generated deduction reason when parser support exists.
- A visual separation between:
  - invoice facts extracted from the document
  - user category decisions
  - optional AI deduction suggestions in a later slice
  - user-entered notes and final decisions

Slice 2 may require new storage for extraction evidence. Do not add it until the UI and parser shape are clear.

## User Flow

Recommended review flow:

1. User opens `Review > Pending`.
2. User selects the first pending invoice item.
3. Detail page opens with source context on the left and editable review fields on the right.
4. User checks the extracted facts.
5. User corrects wrong or missing values.
6. User chooses a category.
7. User adds a note if personal context is needed.
8. User accepts or rejects the item.
9. The app saves the changes and stays on the invoice detail page with updated status.
10. Dashboard counts and export readiness update.

Recommended demo script:

```text
"This PDF was imported and processed automatically."
"The app extracted the vendor, date, amount, and item."
"I can correct the AI output before it affects my tax handover."
"This one is work-related, so I select the category and accept it."
"This one is private, so I reject it."
"Now the dashboard and export package reflect my reviewed decisions."
```

## UX Structure

### Invoice Detail Layout

Use a two-column layout on desktop:

```text
+--------------------------------------+----------------------------------+
| Source context                       | Review panel                     |
|                                      |                                  |
| document metadata                    | status                           |
| document preview or evidence lines   | editable invoice facts           |
| linked document action               | editable tax relevance fields    |
|                                      | note                             |
|                                      | save / accept / reject actions   |
+--------------------------------------+----------------------------------+
```

On narrow screens, stack source context above the review panel.

### Review Panel Sections

Recommended sections:

1. Status and actions.
2. Invoice facts.
3. Item details.
4. Tax relevance.
5. User note.

Tax relevance in Slice 1 means category and review status. Deduction reason is not required for the first demo workflow.

Fields:

| Field | Source table | Editable in Slice 1 |
| --- | --- | --- |
| Vendor | `invoices.vendor` | Yes |
| Invoice date | `invoices.invoice_date` | Yes |
| Invoice number | `invoices.invoice_number` | Yes |
| Description | `invoice_items.description` | Yes |
| Amount | `invoice_items.amount_cents` | Yes |
| Currency | `invoice_items.currency` | No, keep EUR for now |
| Tax year | `invoice_items.tax_year` | Yes |
| Category | `invoice_items.category_id` | Yes |
| Deduction reason | `invoice_items.deduction_reason` | Optional manual edit, not required |
| Note | `invoice_items.note` | Yes |
| Review status | `invoice_items.review_status` | Yes |

### Source Context Panel

Slice 1 source context:

- original file name
- source label
- import date
- processing status
- processing error when present
- linked document button

Slice 2 source context:

- PDF preview or secure file preview
- extracted text snippets
- field-level evidence references
- low-confidence field highlights

### Queue Navigation

Do not add automatic next-item navigation in Slice 1. Keep saves predictable and route-neutral until the first editable review workflow exists.

Slice 1 behavior:

- `Save` persists edits and stays on the invoice detail page.
- `Accept` persists edits with `reviewStatus = 'accepted'` and stays on the invoice detail page.
- `Reject` persists edits with `reviewStatus = 'rejected'` and stays on the invoice detail page.

Next/previous pending navigation can be added after the review mutation and form behavior are stable.

## Data Model

### Slice 1

No new tables are required.

Update existing rows:

- `invoices.updated_at`
- `invoice_items.updated_at`
- edited invoice fields
- edited invoice item fields
- `invoice_items.review_status`

Validation rules:

- vendor must be non-empty.
- invoice date must be a valid ISO date.
- invoice number may be empty.
- description must be non-empty.
- amount must be positive.
- currency remains `EUR`.
- tax year must be a reasonable integer year.
- category must be one of the known tax category ids.
- review status must be one of the known review statuses.
- deduction reason and note may be empty.

Store amounts as integer cents. The renderer should display decimal euros, but the main process should validate and persist cents.

### Slice 2

Consider a small provenance store only when evidence display is implemented.

Possible shape:

```ts
type InvoiceItemEvidence = {
  invoiceItemId: string;
  fields: {
    vendor?: EvidenceReference[];
    invoiceDate?: EvidenceReference[];
    invoiceNumber?: EvidenceReference[];
    description?: EvidenceReference[];
    amount?: EvidenceReference[];
    category?: EvidenceReference[];
    deductionReason?: EvidenceReference[];
  };
};

type EvidenceReference = {
  pageNumber?: number;
  text: string;
  confidence?: 'low' | 'medium' | 'high';
};
```

Storage options:

1. Add `documents.extraction_json` with normalized extracted text and parser evidence.
2. Add `invoice_items.evidence_json` for item-specific evidence.
3. Add a dedicated `invoice_item_evidence` table if querying evidence becomes important.

Recommended first evidence storage: `invoice_items.evidence_json`, because the review page is item-centered and the first UI only needs evidence for the selected item.

## API And IPC

Add write APIs through the preload bridge. Keep validation in the main process.

Recommended shared request type:

```ts
type UpdateInvoiceItemReviewRequest = {
  invoiceItemId: string;
  invoice: {
    vendor: string;
    invoiceDate: string;
    invoiceNumber?: string;
  };
  item: {
    description: string;
    amount: number;
    taxYear: number;
    categoryId: TaxCategoryId;
    deductionReason?: string;
    note?: string;
    reviewStatus: ReviewStatus;
  };
};
```

Recommended API method:

```ts
type DeductionsDataApi = {
  updateInvoiceItemReview(
    request: UpdateInvoiceItemReviewRequest,
  ): Promise<InvoiceItemDetail | null>;
};
```

Implementation notes:

- Fetch the target invoice item and joined invoice before updating.
- Update invoice and item in one transaction.
- Return the updated `InvoiceItemDetail`.
- Do not allow the renderer to provide document paths.
- Do not let this method move an invoice item to a different invoice in the first slice.
- Reuse existing category, review-status, and tax-year validation helpers in IPC where possible.

## Review Status Semantics

Use the existing three statuses:

| Status | Meaning |
| --- | --- |
| `pending` | Needs user review before it should be treated as confirmed. |
| `accepted` | User wants the item included in the handover package as reviewed. |
| `rejected` | User does not want the item included in normal export output. |

Do not add "consultant review" as a fourth review status in this feature. It should become a separate flag later because an item can be accepted and still require consultant attention.

Near-term workaround:

- Use the note field for consultant context.
- Keep pending items visible in export as "In review" for consultant review.
- Keep rejected items out of normal export output.

Future schema option:

```ts
invoice_items.needs_consultant_review boolean default false
```

## AI And Evidence

The current parser extracts factual invoice data. For review confidence, the parser can later return warnings and evidence snippets.

Automatic deduction-reason generation belongs in a later parser extension. It should not block Slice 1.

Recommended future parser extension:

```ts
type ParsedInvoiceItem = {
  description: string;
  amountText: string;
  categoryId?: TaxCategoryId;
  deductionReason?: string;
  warnings: string[];
  evidence: {
    description?: string[];
    amount?: string[];
    deductionReason?: string[];
  };
};
```

Guidelines:

- Evidence snippets should be short excerpts, not entire pages.
- The app should not claim evidence proves deductibility.
- AI-generated reasons should use cautious wording such as "may be relevant" and "review whether".
- Low-confidence items should remain pending.

## Implementation Slices

### Slice 1 Tasks

1. Add shared request and response types for review updates.
2. Add `updateInvoiceItemReview` to the data interface.
3. Implement SQLite transaction updates for `invoices` and `invoice_items`.
4. Add IPC channel and preload bridge method.
5. Add unit tests for validation and persistence.
6. Replace read-only `InvoiceDetailView` content with an editable form centered on extracted facts, category, note, and review status.
7. Enable `Accept`, `Reject`, and `Save`.
8. Revalidate route data after saves.
9. Add renderer tests for bridge wiring or form behavior where practical.
10. Update e2e smoke coverage to verify accept/reject changes visible text or counts.

### Slice 2 Tasks

1. Decide whether first evidence display uses PDF preview, extracted text snippets, or both.
2. Add a secure main-process way to expose document preview or extracted text.
3. Extend parser result with warnings and evidence snippets.
4. Store evidence in a small JSON field or item evidence table.
5. Show evidence next to relevant fields.
6. Add low-confidence or needs-attention markers.
7. Add tests for evidence mapping and review rendering.

### Slice 3 Tasks

1. Add batch quick actions in review queues.
2. Add next/previous pending navigation.
3. Add filters for review status, source, month, and category.
4. Add consultant-review flag if the workflow proves useful.
5. Add export validation warnings that point back to editable review fields.

## Testing Plan

Unit tests:

- validates update request shape.
- rejects invalid tax year, category, status, date, and amount.
- updates invoice and invoice item in one transaction.
- returns updated item detail.
- preserves unrelated documents and invoice items.
- keeps rejected items out of normal export output.
- includes accepted and pending items in export with correct review labels.

Renderer tests:

- renders editable fields from loader data.
- disables save while saving.
- calls the bridge method with normalized values.
- shows validation errors from failed saves.
- updates action buttons for pending, accepted, and rejected items.

E2E tests:

- open pending review.
- open an item.
- edit note or category.
- accept item.
- verify pending count decreases and accepted count increases.
- export selected year and verify the spreadsheet row uses the edited values.

Manual demo QA:

- review form works at common desktop window sizes.
- text does not overflow in amount, category, note, and optional reason fields.
- rejected items remain findable.
- export dialog reflects updated counts after review.
- app restart preserves review decisions.

## Design Risks

- Editing invoice header data from an item page can affect sibling items from the same invoice. The UI should make this acceptable by showing that vendor/date/invoice number are invoice-level fields.
- A full PDF preview may take longer than the review mutation workflow. If time is short, ship source metadata and extracted snippets first.
- Confidence display without stored evidence can feel arbitrary. Do not add confidence labels unless the app can explain them.
- Adding a consultant-review status now would conflict with the existing three-status model. Treat it as a later flag.
- AI reasons can be mistaken for tax advice. Use conservative language and keep user acceptance explicit.
- Requiring deduction reasons before they are generated would make the first review workflow feel heavier than necessary. Keep reason optional until there is a clear user or export need.

## Final Decisions

- Slice 1 implements editable review decisions only.
- `Save`, `Accept`, and `Reject` stay on the invoice detail page after persisting.
- Pending items remain included in export by default and are labeled as in review.
- Rejected items remain excluded from normal export output.
- Slice 1 uses source metadata and document linkage only. PDF preview, extracted snippets, confidence, and evidence display move to Slice 2.
- Amount editing uses a normalized decimal value in the UI request. Locale-specific free-form amount parsing is not required for Slice 1.
- Editing invoice date does not automatically rewrite `taxYear` in Slice 1. The user can edit tax year explicitly.
- Deduction reason remains optional and manually editable only if present. Automatic deduction-reason generation moves to a later parser extension.
- Consultant-review handling remains a future flag, not a new review status.

## First Cut Rationale

Slice 1 creates the core product behavior with low schema risk:

- pending item becomes reviewed.
- AI output becomes user-controlled.
- category selection captures the first tax-relevance decision.
- dashboards become meaningful.
- export becomes credible.

Then add the smallest useful Slice 2 evidence display that can be completed reliably before the demo.
