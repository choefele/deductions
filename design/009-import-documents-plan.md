# Import Documents Plan

## Purpose

Plan the Documents screen and document handling workflow after the sidebar navigation is simplified.

This plan builds on `008-sidebar-navigation-plan.md`. It assumes the sidebar has a top-level `Documents` item and that invoice/item review happens inside each tax year.

This is a design plan only. It does not implement schema, IPC, routing, background processing, or UI changes.

## Current Decisions

- Imported files become `documents` first.
- Users can import one or more documents at a time.
- The first supported file type is PDF. Images can be added later through the same import path.
- File import can start from `File > Import`, the `Import invoice` button, or drag and drop on the app window.
- `Documents` is the durable import history and document operations screen.
- Source is shown as document metadata, not as a sidebar item.
- Document-level problems stay in `Documents`.
- Invoice and invoice-item problems appear in the relevant tax year `Review` view.
- Background processing will later generate invoices and invoice items from documents.

## Document Workflow

Imported documents are the intake record. They do not need a tax year at import time.

Recommended flow:

```text
manual import or future source import
  -> document stored in profile
  -> processing starts
  -> invoice draft generated
  -> invoice item drafts generated
  -> items appear in the relevant tax year Review view
  -> user accepts or rejects items
  -> accepted items become part of the tax-year result
```

The `documents` table remains the durable record that the app has a copy of a file. `invoices` and `invoice_items` are structured records attached to documents.

Tax-year views are driven by invoice items, not by documents directly. This matters because:

- the app may not know the tax year immediately after import.
- one document can produce multiple invoice items.
- a document may be ambiguous, duplicated, unreadable, or not tax-relevant.
- document processing can fail before any invoice item exists.

## Import Entry Points

Support three import entry points:

- `File > Import` menu item.
- `Import invoice` button.
- Drag and drop files on the app window.

`File > Import` and `Import invoice` should open the same file dialog. This appears to already exist and should remain the primary explicit import flow.

Drag and drop is the new entry point:

1. User drags one or more files over the app window.
2. The UI changes to show a clear drop target.
3. User releases the files.
4. The app imports those files and returns to or stays on `Documents`.
5. The latest import outcome is shown inside the `Documents` view.

Keep drag and drop simple:

- Accept files only, not folders, text, URLs, or arbitrary drag data.
- Accept PDFs in the first version.
- Ignore or report unsupported file types in the same latest-import summary used for failed imports.
- Do not add per-view drop zones. Treat the app window as the drop target.
- Do not add upload queues, progress panels, or persistent import history in this slice.
- Do not start background extraction as part of this feature unless that work is already in scope.

## Import Code Path

All import entry points should converge as early as possible on the same import function.

Recommended shape:

```text
File > Import
  -> open file dialog
  -> selected file paths
  -> importDocuments(filePaths)

Import invoice button
  -> open file dialog
  -> selected file paths
  -> importDocuments(filePaths)

Drag and drop
  -> dropped file paths
  -> importDocuments(filePaths)
```

The dialog flow and the drag-and-drop flow should differ only in how they obtain file paths. Duplicate detection, storage, result shape, latest-import summary, and document-list refresh should be shared.

Keep the first implementation PDF-only at the UI boundary and in import validation. When image support is added later, it should extend accepted file types without changing the overall flow.

## Review Ownership

Use two separate ownership rules:

- Document-level problems live in `Documents`.
- Invoice and invoice-item problems live in the relevant tax year `Review` view.

Examples:

- Processing failed: `Documents`
- No invoice found: `Documents`
- Duplicate document needs resolution: `Documents`
- Invoice header is incomplete after extraction: tax year `Review`
- Invoice item needs accept/reject decision: tax year `Review`
- Category, amount, tax year, or deduction reason needs correction: tax year `Review`

Avoid forcing document-level problems into `invoice_items.reviewStatus`. Some problems happen before an invoice item exists.

## Document Lifecycle

Documents need their own lifecycle because document-level problems are different from invoice/item review.

Recommended states:

| State          | Meaning                                                                                                        | User action                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `imported`     | File was copied into profile storage, but no processing has started.                                           | Wait, process now, or remove from inbox.                       |
| `processing`   | A background process is extracting invoice facts and item suggestions.                                         | Usually none.                                                  |
| `needs_review` | Processing failed, found no invoice, found ambiguous data, or needs manual confirmation before creating items. | Retry, mark as not relevant, or create invoice/items manually. |
| `processed`    | Processing created invoice/item drafts or the document was intentionally resolved.                             | Review generated items in the relevant tax year if any.        |

Keep the document state minimal. Whether linked invoice items are still in `Review`, already `Accepted`, or already `Rejected` belongs to the tax-year item workflow, not to the document lifecycle.

## Documents View

The `Documents` view is the user's durable import history.

Recommended list columns:

- file name
- source
- import time
- processing status
- linked invoice count
- pending item count
- tax years represented by linked items
- latest error or next action

The first version should show all documents in one chronological list sorted by import time. Status and source filters should be planned in a separate feature.

Recommended document detail panel:

- document preview or open-file action
- source and storage metadata
- document status and latest processing message
- linked invoice header data
- linked invoice items
- actions: retry processing, mark not relevant, create invoice manually, open linked tax-year review

There should be no `Sources` sidebar item for now. Source filters should be planned in a separate Documents filtering feature. If source setup and source health later become substantial, move them into a settings/profile area.

## Sidebar Badge

The `Documents` sidebar badge should count documents with unresolved document-level problems.

Examples:

- processing failed.
- processing found no invoice and the user has not resolved it.
- document is ambiguous.
- duplicate document needs user resolution.

It should not count normal pending invoice items. Those belong to the relevant tax-year `Review` badge.

## Latest Import Summary

Do not keep a separate import result view for this feature. Fold import result feedback into the `Documents` view.

After file selection, return the user to `Documents` and show the latest import outcome there. This keeps document import, document history, and document-level errors in one place.

Recommended behavior:

- Newly imported documents appear in the chronological list.
- The view shows a short summary for the latest import.
- Successfully imported files can be visually highlighted in the list for the current session.
- Skipped duplicates and failed file imports are shown in a compact result area above or near the list.
- If processing immediately generates invoice items, link to the affected tax-year `Review` view from the document row or result summary.
- Failed file imports can expose a retry action when retrying is technically possible.

## Data Model Additions To Consider

The current storage plan already has the core tables needed for the first Documents slice:

- `documents` for imported file metadata and storage paths.
- `sources` for source metadata shown on document rows.
- `invoices` and `invoice_items` for generated or manually created structured records linked back to documents.

For the first implementation, avoid adding new status/history tables. The Documents screen can use existing document rows plus joined invoice/item counts. The latest import summary can come from the import result passed back to the renderer, without extra persistence.

Only add a document status field when background processing is actually implemented. Until then, the UI can use simple derived labels such as `Imported` or `Has invoice items`.

## First Documents Slice

Recommended first Documents slice:

1. Add document list API methods:
   - list document summaries
   - get one document detail
2. Add `/documents` route and `DocumentsView`.
3. Keep `File > Import` and `Import invoice` using the same file-dialog import path.
4. Add app-window drag and drop for PDF files.
5. Route users back to `/documents` after file import.
6. Show latest import outcomes inside `Documents` instead of a separate import result view.
7. Show imported documents with simple derived status:
   - `Imported`
   - `Has invoice items`
   - `Needs review` once processing failures exist
8. Keep background processing out of this slice unless extraction is being built at the same time.

This creates the permanent place where imported files live before adding automation.

## Future Background Processing Slice

Recommended later slice:

1. Add document processing status.
2. Start or schedule background processing for every successfully imported document.
3. Add processing status badges to the documents list.
4. Generate invoice and invoice item drafts in a transaction.
5. Add document-level retry and resolve actions.
6. Add tax-year `Review` counts for generated invoice/item work.
7. Add a separate `Documents` count for document-level failures.

Scheduled sources should feed the same pipeline as manual import. The only difference should be source and trigger metadata.

## Open Questions

- Should users be able to delete an imported document, or only mark it as not relevant?
- Should "not an invoice" be a document-level resolved state, or should it create a rejected invoice record?
- Should duplicate detection be document-only by file hash, invoice-level by invoice facts, or both?
- Should manual invoice creation be available from the first Documents view, or wait until extraction failures exist?
