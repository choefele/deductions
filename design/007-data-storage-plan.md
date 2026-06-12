# Data Storage Plan

## Purpose

Move Deductions from renderer-side mock data to durable local storage while keeping the data model simple, reviewable, and migration-friendly.

This plan starts from `app/renderer/data/deductionRepository.ts`, but treats that file as the current UI-facing read model rather than the final persistence model.

## Current Decision Set

- Use SQLite for local persistence.
- Use `better-sqlite3` as the SQLite driver.
- Use Drizzle to define schema in TypeScript and generate migrations.
- Keep all database access in the Electron main process.
- Expose data to the renderer through a typed IPC API.
- Keep original documents outside SQLite in a user-specific document folder.
- Use one active profile in the UI for now, with one database and document folder per profile.
- Keep the renderer dependent on a `DeductionsDataApi`-shaped interface so the mock can remain useful in tests and story development.

## Key Challenge: One Item Table, Not One Table Per Year

The product idea is that reviewed invoice items are mostly browsed by tax year. That does not require separate physical tables per year.

Recommended 80/20 design:

- One `invoices` table.
- One `invoice_items` table.
- A required `tax_year` column on `invoice_items`.
- Indexes for the common filters.

This keeps migrations, search, duplicate detection, and "all years" dashboards straightforward. Separate `invoice_items_2024`, `invoice_items_2025`, etc. tables would make every schema migration and cross-year query harder without a clear benefit for the expected local dataset size.

## Process Boundary

```text
renderer React views
  -> renderer data API adapter
  -> preload window.deductions.data.*
  -> IPC channels
  -> main process data layer
  -> Drizzle + better-sqlite3
  -> SQLite database file
```

The renderer should not import `better-sqlite3`, Drizzle, or database schema files. The renderer receives domain objects only.

## Proposed File Layout

```text
app/
  main/
    data/
      database.ts
      schema.ts
      migrations.ts
      sqliteDeductionsData.ts
      seedDevelopmentData.ts
      documentStorage.ts
      profileRegistry.ts
      drizzle/
        0000_initial.sql
        meta/

  renderer/
    data/
      ipcDeductionsData.ts
      mockDeductionsData.ts
      data.ts

  shared/
    deductions.ts
    ipc.ts

drizzle.config.ts

tests/
  unit/
    main/
      sqliteDeductionsData.test.ts
      migrations.test.ts
    renderer/
      ipcDeductionsData.test.ts
```

Move process-neutral domain types out of `app/renderer/data/deductionRepository.ts` into `app/shared/deductions.ts`. Both main and renderer can then use the same public contract without creating a main-to-renderer dependency.

## Storage Location

Use Electron's app data directory as the default root.

Suggested shape:

```text
<app userData>/
  profiles.json
  profiles/
    <profile-id>/
      deductions.sqlite
      documents/
        <tax-year>/
          <document-id>.<extension>
```

SQLite stores relative document paths, not absolute paths. Relative paths make future profile directory moves and backups easier.

## User Separation

Decision: support one active local user profile in the UI for now, but store each profile in its own database and document folder.

This gives stronger accidental data isolation than a shared database with `user_id` filters on every query. It also keeps common queries simpler because every opened database already represents exactly one user profile.

Use a small app-level profile registry outside the per-user databases:

```ts
profiles: Array<{
  id: string;
  displayName: string;
  directoryName: string;
  createdAt: string;
  lastOpenedAt: string;
}>;
activeProfileId: string;
```

`profiles.json` is enough for the first version. It does not store invoice data. It only tells the main process which profile directory and database to open.

Data methods should use the active profile selected in the main process. The renderer should not pass a profile ID to normal invoice/document queries.

No workspace abstraction yet. A profile is the storage boundary. Add workspaces only if the product later needs multiple separate tax projects inside one user profile.

## Schema Proposal

The schema examples below use TypeScript-style Drizzle property names. Drizzle should map those properties to snake_case SQLite column names, for example `sourceId` -> `source_id` and `createdAt` -> `created_at`.

### user_profile

Stores local app user/profile data inside the profile's own database. This is a singleton table with one row.

```ts
userProfile: {
  id: text primary key,
  displayName: text not null,
  settingsJson: text not null default '{}',
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Keep settings as JSON initially because user preferences will evolve. Only promote a setting to a real column once the app needs to query or index it.

### categories

Stores stable deduction category definitions.

```ts
categories: {
  id: text primary key,
  label: text not null,
  description: text not null,
  sortOrder: integer not null,
  isSystem: integer not null default 1,
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Seed this table with the four initial deduction categories plus one fallback category:

- `work-related-expenses`
- `special-expenses`
- `extraordinary-burdens`
- `household-services`
- `uncategorized`

`uncategorized` is a workflow fallback for imported or extracted invoices that do not yet have a category assignment. It is not a tax category for export.

Do not include `not-tax-relevant` as a category. Tax relevance belongs in `reviewStatus`: rejected invoices stay out of export through `reviewStatus = 'rejected'`, not by assigning a pseudo-category.

Categories stay seeded/system-only in the first persistent version. Do not add user-custom category editing until there is a concrete workflow that needs it.

### sources

Stores manual and automated import sources.

```ts
sources: {
  id: text primary key,
  kind: text not null,
  label: text not null,
  status: text not null default 'active',
  lastCheckedAt: integer,
  settingsJson: text not null default '{}',
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

The current `SourceId` union should eventually become a plain string ID. Hard-coding only `manual-upload` and `connected-source` will become too rigid once Amazon, email, folder imports, and other connectors exist.

Seed one source per user:

- `id`: generated opaque ID
- `kind`: `manual-upload`
- `label`: `Manual upload`

Do not use a literal `manual-upload` primary key. The source ID should be opaque; `kind` should carry the semantic source type.

### documents

Stores successfully imported file metadata and points to files on disk.

```ts
documents: {
  id: text primary key,
  sourceId: text not null references sources.id,
  originalFileName: text not null,
  storagePath: text not null,
  mimeType: text not null,
  sha256: text not null,
  importedAt: integer not null,
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Recommended constraints and indexes:

- unique index on `sha256` for duplicate detection within the active profile.
- index on `source_id`.
- index on `imported_at`.

Do not store `taxYear` on documents in the first schema. Tax-year views are driven by invoice items, and duplicating tax year on both document and invoice item can drift.

Do not store failed/skipped import rows in `documents`. Add `import_batches` or `import_attempts` later if user-visible import history becomes necessary.

### invoices

Stores invoice-level facts recognized from a document.

```ts
invoices: {
  id: text primary key,
  documentId: text references documents.id,
  sourceId: text not null references sources.id,
  vendor: text not null,
  invoiceDate: text not null,
  invoiceNumber: text,
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Recommended constraints and indexes:

- index on `source_id`.
- optional unique index on `(source_id, invoice_number, vendor, invoice_date)` where `invoice_number is not null`.

`invoiceDate` is the factual date printed on the invoice. It is not the same as `taxYear`, which belongs to the review/export assignment on invoice items.

Do not store invoice-level total amount or currency for now. The review/export amount lives on invoice items.

### invoice_items

Stores recognized or manually created invoice items. This is the tax-review and export unit that drives most app screens.

```ts
invoiceItems: {
  id: text primary key,
  invoiceId: text not null references invoices.id,
  description: text not null,
  amountCents: integer not null,
  currency: text not null default 'EUR',
  taxYear: integer not null,
  categoryId: text not null references categories.id,
  reviewStatus: text not null,
  deductionReason: text not null,
  note: text,
  sortOrder: integer not null,
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Recommended constraints and indexes:

- index on `invoice_id`.
- index on `tax_year`.
- index on `(tax_year, category_id)`.
- index on `review_status`.

Store money as integer cents, not floating-point `REAL`. Convert to the current UI `amount: number` at the data API boundary.

Each invoice must have one or more invoice items. If extraction fails to recognize items, do not create an invoice with no items and do not create synthetic items. The user can manually create invoice items, retry extraction, or discard the document.

Enforce this as a main-process data-layer/UI invariant in the first implementation: create the invoice and its real items in one transaction. SQLite can enforce parent-to-child validity with foreign keys, but enforcing "every invoice has at least one child item" requires triggers or deferred checks. Avoid that DB-level complexity until the invariant proves hard to maintain in application code.

### Review Flags

Do not add a generic `invoice_flags` table in the first persistent schema.

The current `ReviewFlag` type is too open-ended for the product model:

- `needs-consultant-review` is a possible future workflow, but it is not needed in the first persistent model.
- `export-issue` should usually be derived from export validation, not stored as user-maintained invoice state.

This keeps the core model easier to query and avoids inventing a generic flag system before the app has enough distinct flag use cases.

Future option: if there are several real, user-visible markers that need custom labels, timestamps, and auditability, add an explicit `invoice_markers` or `invoice_review_tasks` table later.

### Confidence

Do not store invoice-level `confidence` in the core `invoices` table for the first persistent schema.

A single invoice confidence value is ambiguous because it could mean:

- confidence that the document is an invoice.
- confidence in extracted fields such as vendor, date, amount, or invoice number.
- confidence in the suggested tax category.
- confidence in the deduction reason.
- confidence that the item is export-ready.

These are different concepts and should not be collapsed into one field.

80/20 recommendation:

- Remove invoice or item level `confidence` from the planned durable model.
- Remove the `low-confidence` review queue from the persistent data API until real extraction/classification confidence exists.
- Derive export readiness from validation checks instead of storing `export-issue`.
- When AI extraction is implemented, store confidence at the suggestion or field level.

Possible future table:

```ts
extractedFields: {
  id: text primary key,
  extractionRunId: text not null references extractionRuns.id,
  documentId: text not null references documents.id,
  invoiceId: text references invoices.id,
  fieldName: text not null,
  valueJson: text not null,
  confidenceScore: real,
  createdAt: integer not null,
}
```

Possible future category suggestion fields:

```ts
classificationSuggestions: {
  id: text primary key,
  invoiceId: text not null references invoices.id,
  suggestedCategoryId: text not null references categories.id,
  confidenceScore: real,
  reason: text not null,
  createdAt: integer not null,
}
```

Use numeric `confidenceScore` in future AI-specific tables if the provider returns meaningful scores. Otherwise store qualitative labels only as provider metadata, not as core business state.

### extraction_runs

Optional for the first persistence slice, but worth planning.

```ts
extractionRuns: {
  id: text primary key,
  documentId: text not null references documents.id,
  status: text not null,
  provider: text,
  model: text,
  rawResultJson: text not null default '{}',
  errorMessage: text,
  createdAt: integer not null,
}
```

80/20 recommendation: include this only when real extraction is implemented. Do not block the basic database migration on extraction history.

## Drizzle Usage

Use Drizzle for:

- schema definitions in `app/main/data/schema.ts`.
- inferred row and insert types.
- query building where it remains readable.
- generated SQL migrations through `drizzle-kit`.

Use raw SQL through Drizzle's `sql` helper for aggregate queries when it is clearer than complex query-builder code.

Drizzle's docs list native SQLite support for `better-sqlite3`, with initialization through `drizzle-orm/better-sqlite3`. They also document `drizzle-kit migrate` as applying generated SQL migrations and logging applied migrations in the database.

## Database Initialization

`app/main/data/database.ts` should:

1. Read or create the profile registry.
2. Resolve the active profile database path.
3. Open `better-sqlite3`.
4. Set basic PRAGMAs:
   - `foreign_keys = ON`
   - `journal_mode = WAL`
   - `busy_timeout = 5000`
5. Run Drizzle migrations.
6. Seed required system categories.
7. Ensure a default local profile exists until real onboarding exists.
8. Ensure the profile has one source with `kind = 'manual-upload'`.
9. Return a data-layer instance bound to the active profile database.

Keep database opening and migrations out of React startup. The main process owns this lifecycle.

## Main-Process Data Operations

The main-process data layer should follow the database shape, even when that requires changing the renderer read model. The old flat `Invoice` read model should not remain the canonical API once persistence exists.

### listCategories

Returns all active categories ordered by `sort_order`.

### getAllYearsSummary

Returns:

- tax-year summaries for years found in `invoice_items`.
- global count summary for the active profile.
- `recentInvoiceItems` ordered by `invoice_items.updated_at desc` or `invoice_items.created_at desc`.

Implementation can use 2-3 focused queries and merge in TypeScript. Do not prematurely optimize into one large query.

### listTaxYears

Returns one `TaxYearSummary` per distinct `invoice_items.tax_year` for the active profile.

### getTaxYearSummary(year)

Returns null if no invoice items exist for that profile/year.

### listInvoiceItemsByCategory(year, categoryId)

Filters by:

- tax year
- category

Returns invoice item summary read models for the requested category. Include enough joined invoice header data to render lists without a second IPC call, for example vendor, invoice date, and invoice number.

### listReviewQueueItems(queue)

Review queues are global across all tax years in the first persistent version.

Maps queues to filters:

- `pending`: `invoice_items.review_status = 'pending'`
- `export-issues`: derived from export validation checks, for example accepted invoice missing a document.

Do not persist or expose a `low-confidence` queue in the first SQLite-backed API. Add it later only when extraction or classification confidence is modeled precisely.

### getInvoiceItemById(invoiceItemId)

Filters by:

- invoice item id

Returns a detail read model for one invoice item, joined with its invoice header and source document metadata.

### getInvoiceById(invoiceId)

Filters by:

- invoice id

Returns an invoice detail read model with header facts, source document metadata, and all invoice items. This supports future invoice-level screens. The initial UI may not need this if users mostly drill into invoice item detail.

### listSources

Returns `SourceSummary[]` for the active profile:

- `documentCount` for source/import health.
- `invoiceCount` for recognized invoice headers.
- `invoiceItemCount` for tax progress.

## IPC API

Expose data reads through explicit IPC channels, not a generic SQL or generic repository channel.

Suggested shared read models in `app/shared/deductions.ts`:

```ts
export type DocumentSummary = {
  id: string;
  sourceId: SourceId;
  originalFileName: string;
  storagePath: string;
  mimeType: string;
  sha256: string;
  importedAt: string;
};

export type InvoiceHeader = {
  id: string;
  documentId: string;
  sourceId: SourceId;
  vendor: string;
  invoiceDate: string;
  invoiceNumber?: string;
};

export type InvoiceItemSummary = {
  id: string;
  invoiceId: string;
  documentId: string;
  sourceId: SourceId;
  vendor: string;
  invoiceDate: string;
  invoiceNumber?: string;
  description: string;
  amount: number;
  currency: 'EUR';
  taxYear: number;
  categoryId: TaxCategoryId;
  reviewStatus: ReviewStatus;
};

export type InvoiceItemDetail = InvoiceItemSummary & {
  deductionReason: string;
  note?: string;
  document: DocumentSummary;
};

export type InvoiceDetail = InvoiceHeader & {
  document: DocumentSummary;
  items: InvoiceItemDetail[];
};

export type CountSummary = {
  pending: number;
  accepted: number;
  rejected: number;
  exportIssues: number;
};

export type CategorySummary = {
  category: TaxCategory;
  total: number;
  counts: CountSummary;
};

export type TaxYearSummary = {
  year: number;
  total: number;
  counts: CountSummary;
  categories: CategorySummary[];
};

export type AllYearsSummary = {
  years: TaxYearSummary[];
  counts: CountSummary;
  recentInvoiceItems: InvoiceItemSummary[];
};

export type SourceSummary = {
  id: SourceId;
  label: string;
  documentCount: number;
  invoiceCount: number;
  invoiceItemCount: number;
};
```

Suggested contract in `app/shared/ipc.ts`:

```ts
deductionsData: {
  listCategories(): Promise<TaxCategory[]>;
  getAllYearsSummary(): Promise<AllYearsSummary>;
  listTaxYears(): Promise<TaxYearSummary[]>;
  getTaxYearSummary(year: number): Promise<TaxYearSummary | null>;
  listInvoiceItemsByCategory(
    year: number,
    categoryId: TaxCategoryId,
  ): Promise<InvoiceItemSummary[]>;
  listReviewQueueItems(queue: ReviewQueueId): Promise<InvoiceItemSummary[]>;
  getInvoiceItemById(invoiceItemId: string): Promise<InvoiceItemDetail | null>;
  getInvoiceById(invoiceId: string): Promise<InvoiceDetail | null>;
  listSources(): Promise<SourceSummary[]>;
}
```

The handler layer should validate IPC parameters before calling the data layer. At minimum:

- year is an integer in a reasonable range.
- category id is known.
- review queue id is known.
- invoice item id and invoice id are non-empty strings.

The renderer must not pass a profile ID to these data methods. Main process routes them to the active profile database.

## Renderer Access

Create `app/renderer/data/ipcDeductionsData.ts`:

```ts
export const ipcDeductionsData: DeductionsDataApi = {
  listCategories: () => window.deductions.data.listCategories(),
  getAllYearsSummary: () => window.deductions.data.getAllYearsSummary(),
  // ...
};
```

Then change `app/renderer/data/data.ts` or replace the current repository module with a more explicit data API export:

```ts
export const deductionsData = ipcDeductionsData;
```

Keep mock data for:

- focused renderer tests.
- possible story/demo states.
- fallback development if the main database is not being run.

## Renderer/UI Impact

The UI may continue to use user-facing labels like "Invoices", but route data and component props should become item-centric where the data is item-centric.

Recommended changes during implementation:

- Category table: render `InvoiceItemSummary[]`, not `Invoice[]`.
- Review queue table: render `InvoiceItemSummary[]`.
- Detail route: prefer `/invoice-items/:invoiceItemId` for the first persisted detail screen.
- Invoice route: reserve `/invoices/:invoiceId` for a future header-level screen that shows all items from one invoice.
- Dashboard totals: aggregate `invoice_items`, not `invoices`.
- Recent list: show recent invoice items with joined invoice vendor/date.

This is a meaningful UI code change, but it keeps the renderer aligned with the durable data model instead of preserving a misleading flat `Invoice` abstraction.

## Shared Type Changes

### Shared Type Location

Current deduction domain types live in `app/renderer/data/deductionRepository.ts`.

Recommended:

- Move process-neutral types to `app/shared/deductions.ts`.
- Keep renderer data adapters in `app/renderer/data`.
- Let both main and renderer import the shared contract from `app/shared/deductions.ts`.

This is part of the storage implementation slice, not a separate refactor.

### InvoiceItem.reviewStatus

Current:

```ts
export type Invoice = {
  status: ReviewStatus;
};
```

Recommended:

```ts
export type InvoiceItemSummary = {
  reviewStatus: ReviewStatus;
};
```

Reason: plain `status` becomes ambiguous once the app has document import status, source status, extraction status, and review status. `reviewStatus` belongs on invoice items because invoice items are the reviewed/exportable units. It matches the planned SQLite column `invoice_items.review_status`.

### SourceId

Current:

```ts
export type SourceId = 'manual-upload' | 'connected-source';
```

Recommended:

```ts
export type SourceId = string;
```

Reason: source IDs are data once users can add connected sources.

### InvoiceItem.confidence

Current:

```ts
export type Invoice = {
  confidence: Confidence;
};
```

Recommended:

- Remove `confidence` from the core item read model.
- Remove the generic `Confidence` type from the core shared model.
- Add future confidence fields only where the meaning is precise, such as extracted field confidence or classification suggestion confidence.

Reason: item-level confidence still does not answer a clear product question. If an item has a highly confident amount but a low-confidence category suggestion, one field cannot represent that honestly.

### ReviewFlag

Current:

```ts
export type ReviewFlag = 'needs-consultant-review' | 'export-issue';
```

Recommended:

- Remove `ReviewFlag`.
- Remove `Invoice.flags` / item flags.
- Treat export issues as derived validation results rather than stored invoice state.

Reason: `ReviewFlag` is generic before there is a real generic marker system. It also mixes different concepts: a consultant-review workflow marker and an export validation outcome.

### ReviewQueueId

Current:

```ts
export type ReviewQueueId =
  | 'pending'
  | 'low-confidence'
  | 'consultant-review'
  | 'export-issues';
```

Recommended for the first SQLite-backed version:

```ts
export type ReviewQueueId =
  | 'pending'
  | 'export-issues';
```

`low-confidence` and `consultant-review` are not part of the first persisted API. `export-issues` is backed by validation logic, not an invoice flag.

### CountSummary

Current `CountSummary` includes `lowConfidence`, `consultantReview`, and `exportIssues`.

Recommended:

- Keep `pending`, `accepted`, and `rejected` as direct counts from `reviewStatus`.
- Keep `exportIssues` as a derived validation count.
- Remove `lowConfidence` until confidence has a precise source.
- Remove `consultantReview` until a consultant-review workflow exists.

### TaxCategoryId

Recommended initial category IDs:

- `work-related-expenses`
- `special-expenses`
- `extraordinary-burdens`
- `household-services`
- `uncategorized`

`uncategorized` is required so invoice items can exist before classification. Do not include `not-tax-relevant` or `tradesperson-services` in the initial category set.

### Invoice Date And Tax Year

`invoices.invoiceDate` is the factual date printed on the invoice. Store it as `invoice_date text not null` in `YYYY-MM-DD` format.

`invoiceItems.taxYear` is the tax workflow grouping/export year. Default it from `invoiceDate` when creating items, but keep it item-level and user-reviewable because tax assignment can differ from the invoice date in edge cases.

### Amount

Amounts and currencies belong on invoice items because invoice items are the review/export unit. SQLite stores `invoice_items.amount_cents integer not null`; the UI read model can still expose `amount: number`.

### Reason

Current `reason: string` likely represents an AI/user-facing deduction explanation. In the persisted item model, use `invoice_items.deduction_reason` and expose it as `deductionReason` on `InvoiceItemDetail`.

For 80/20, keep one `deduction_reason` plus one freeform `note`.

### Type Name Consistency

Use these naming decisions in the storage implementation:

- `ReviewStatus`: decided; use with `InvoiceItemSummary.reviewStatus` / `invoice_items.review_status`.
- `TaxCategory` and `TaxCategoryId`: clear for seeded deduction categories.
- `ReviewQueueId`: clear for route/API parameters after reducing first-version queues to `pending` and `export-issues`.
- `CategorySummary`, `TaxYearSummary`, `AllYearsSummary`: clear as UI read models.
- `DeductionsDataApi`: clearer than `DeductionRepository` now that the API exposes documents, invoice headers, and invoice items.
- `SourceId`: should become opaque `string`, with `source.kind` carrying values like `manual-upload`.
- `ImportResult`: currently only contains `fileNames`; real persistence will likely need accepted/skipped/failed rows and document IDs.
- old flat `Invoice`: replace with `InvoiceHeader`, `InvoiceItemSummary`, `InvoiceItemDetail`, and `InvoiceDetail`.

## Testing Plan

### Main Data Unit Tests

Add tests under `tests/unit/main`.

Use a temporary SQLite database per test file or per test case. Run real migrations, seed minimal data, then assert data-layer behavior.

Cover:

- profile registry creates and reopens the default active profile.
- categories are seeded and ordered.
- all-years summary aggregates from the active profile database.
- tax-year summary returns null for missing years.
- category invoice item listing filters by year and category.
- review queues match `reviewStatus` and derived export validation.
- data-layer instances opened for separate profile databases cannot read each other's invoices.
- source listing counts documents, invoice headers, and invoice items by source.
- invoice item money maps between cents and display number correctly.

### Migration Tests

Basic first test:

- empty database migrates successfully.
- required tables and indexes exist.
- seed data can be inserted after migration.

Future tests when schema changes:

- fixture of an older database migrates forward.
- existing invoice/document rows survive.

### IPC Tests

Keep IPC tests light.

Recommended 80/20:

- unit test handler registration with a fake data layer for parameter validation and channel wiring.
- rely on Electron e2e smoke tests for preload exposure.

Avoid testing Drizzle again through IPC. The main data tests should own database correctness.

### Renderer Tests

Add a small `ipcDeductionsData` test with a mocked `window.deductions.data` object.

Existing renderer route/view tests can continue using `mockDeductionsData` where useful.

## Implementation Slices

### Slice 1: Read-Only Persistence Foundation

- Install `better-sqlite3`, `drizzle-orm`, `drizzle-kit`, and `@types/better-sqlite3`.
- Add Drizzle schema and initial migration.
- Add profile registry creation and active profile resolution.
- Add database initialization in main process.
- Seed default profile, categories, source, development invoices, and development invoice items.
- Implement main-process `sqliteDeductionsData`.
- Add main data unit tests.

### Slice 2: IPC Read API

- Move shared deduction types to `app/shared/deductions.ts`.
- Add typed IPC channels for the item-centric data methods.
- Expose data methods through preload.
- Add renderer `ipcDeductionsData`.
- Switch renderer data access from mock to IPC-backed data.
- Update e2e smoke test to verify data renders through IPC.

### Slice 3: Import Writes

- When a user selects files, copy documents into managed storage.
- Insert `documents` rows for successfully stored files.
- Insert `invoices` and `invoice_items` together when invoice header facts and at least one real item are recognized or manually entered.
- Do not add a document-review queue in the first persistent version.
- Surface accepted/skipped/failed import results from the import command result.
- Add persisted import history later with `import_batches` or `import_attempts` if users need to revisit old import outcomes.

Do not combine write/import behavior into Slice 1. The read-only foundation is enough risk for the first storage change.

## References

- Drizzle documents native SQLite support for `better-sqlite3`: https://orm.drizzle.team/docs/get-started-sqlite
- Drizzle Kit migration flow: https://orm.drizzle.team/docs/drizzle-kit-migrate
- `better-sqlite3` API docs: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
