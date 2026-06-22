# Central Review List/Detail Design

Status: initial design comparison and direction. This document does not define an implementation plan yet.

## Purpose

Create a consistent review experience for central work queues in Deductions.

The target pattern is:

1. User sees a list of reviewable items.
2. User selects an item.
3. The detail screen shows the selected item's context.
4. Review or inspection happens in the detail screen.
5. User can move to the previous or next item from the same list.

This should work for at least two current surfaces:

- Imported documents, where detail is mostly read-only and includes document metadata plus extracted invoice items.
- Invoice items, where detail is editable and includes review decisions.

The design goal is not to make every list look identical. The goal is to make selection, detail placement, navigation, and review actions behave consistently enough that users always know where they are and what to do next.

## Current Document Flow

Current route: `/documents`.

Current list source:

- `documentsLoader` loads `listDocumentSummaries()`.
- The page uses the loader result directly as the document table.

Current selection model:

- Selection is held in the `document` search parameter.
- If no document is selected, the page defaults to the first document in the list.
- Clicking a table row updates the search parameter instead of navigating to a separate route.
- Keyboard selection is supported with `Enter` or `Space` on the table row.

Current detail loading:

- `DocumentsView` fetches detail client-side with `getDocumentDetail(selectedDocumentId)`.
- While detail is loading, the panel temporarily renders `No document selected.` because there is no explicit loading state.
- Detail is not a route loader concern.

Current layout:

- The page shows a header, latest import summary, then a document table and detail panel.
- On `xl` and wider windows, the detail panel sits to the right of the table.
- Below `xl`, the CSS grid collapses to one column, so the detail panel appears below the list.
- This means selected details can be easy to miss on smaller or medium windows because users must scroll past the full list.

Current detail content:

- Read-only document metadata:
  - file name
  - storage path
  - source
  - status
  - imported date
  - completed date
  - processor version
  - SHA-256
  - latest processing error
- Contextual actions:
  - process or re-process document
  - links to related tax years or review queue
- Linked invoice items:
  - each item is shown as a compact link to `/invoices/:invoiceId`
  - linked item status is visible

Current document actions:

- Process or re-process is available in the row menu and in the detail panel.
- Delete is available in the row menu only.
- Processing revalidates the route data.
- Deleting the selected document selects another document if one exists.

## Current Invoice Review Flow

Current list routes:

- `/years/:year/review` for pending items.
- `/years/:year/accepted` for accepted items.
- `/years/:year/rejected` for rejected items.

Current list source:

- The route loader fetches invoice items by review status and filters them by tax year.
- `ReviewQueueView` renders the list through `InvoiceTable`.

Current selection model:

- Clicking a row link navigates to `/invoices/:invoiceId`.
- When opened from a review queue, the link includes queue context in search params:
  - `year`
  - `queue`
- Selection is therefore a separate detail route, not a selected row inside the list route.

Current detail loading:

- `invoiceLoader` loads the selected invoice item detail.
- The detail page is route-addressable and can be opened directly.

Current layout:

- The detail page has its own route and replaces the list.
- It shows a source card on the left and an editable review card on the right on large windows.
- On narrower windows, source context stacks above the review card.
- Unlike documents, detail is never hidden below a long list because the list is no longer present.

Current detail content:

- Header:
  - vendor
  - description
  - amount
  - review status
- Source context:
  - document file name
  - source label
  - import date
  - processing status
  - completed date
  - processor version
  - latest processing error
  - `View document` action
- Editable review fields:
  - vendor
  - invoice date
  - invoice number
  - description
  - amount
  - tax year
  - category
  - review status
  - deduction reason when present
  - note

Current review actions:

- `Save` persists edits and stays on the detail page.
- `Accept` saves with `accepted`.
- `Reject` saves with `rejected`.
- If the item was opened from a queue and there is a next item, `Accept` or `Reject` automatically navigates to the next queue item.
- If the item was the last queue item, accepting or rejecting navigates back to the queue.
- `Previous` and `Next` are available only when queue context exists.
- Previous/next navigation saves the current form before navigating.

Current queue context limitation:

- The detail page reconstructs previous/next navigation by fetching the current queue again in the renderer.
- Queue membership is based on the original queue from the URL.
- After an item is accepted or rejected from a pending queue, it may no longer belong to that queue, but the page still uses the previous queue context to decide where to navigate next.

## Similarities

Both current flows have a recognizable list-to-detail relationship.

Both flows expose compact list rows and richer detail content.

Both flows should use the full row as the selection target. Current document rows already behave this way. Current invoice rows expose the vendor link inside the row, which makes the interaction less consistent and requires more precise clicking.

Both flows have a selected entity whose detail includes source metadata.

Both flows connect documents and invoice items:

- Document detail lists linked invoice items.
- Invoice detail shows its source document.

Both flows use URL state for context:

- Documents use a `document` search param.
- Invoice detail uses route params plus optional `year` and `queue` search params.

Both flows have actions that can change the underlying list:

- Documents can be processed or deleted.
- Invoice items can change review status, category, and editable facts.

Both flows need row-level and list-level actions. Today the actions are not presented consistently:

- Documents have a row action menu for process/re-process and delete, plus a process/re-process action in the detail panel.
- Invoice lists do not expose row actions; review decisions live on the detail page.

Both flows need robust responsive behavior because the detail surface can contain more information than the list row.

## Differences

The biggest difference is where detail lives.

| Concern | Documents | Invoice review |
| --- | --- | --- |
| List route | `/documents` | `/years/:year/review`, `/years/:year/accepted`, `/years/:year/rejected` |
| Detail route | Same route, selected by `?document=` | Separate `/invoices/:invoiceId` route |
| Detail placement | Beside list on wide screens, below list otherwise | Replaces list entirely |
| Detail loader | Client-side fetch inside view | Route loader |
| Default selection | First document auto-selected | No auto-selection from list route |
| Row activation | Entire row selects in-place | Vendor link navigates to detail page |
| Previous/next | Not available | Available with queue context |
| Primary work | Inspect document and linked items | Edit and decide invoice item |
| Detail density | Metadata plus many linked items | Source card plus large editable form |
| Row/list actions | Row menu plus detail process action | No row menu; detail review actions |
| Action risk | Processing and deletion | Data mutation and review decision |

This difference explains the current user confusion:

- Documents look like a master/detail workspace, but the detail can move below the table and become easy to overlook.
- Review queues look like a list followed by a separate detail page, but the user loses visible list context after navigating.
- Similar conceptual flows use different interaction models, so users have to learn two patterns for the same kind of task.

## Comparison To Desired Behavior

Desired behavior:

- There is a list of items.
- Clicking an item brings the user to a detail screen.
- Review happens on the detail screen.
- The user can navigate forward and backward through the list from the detail screen.

Documents currently partially match this behavior:

- They have a list and a detail view.
- They do not bring the user to a distinct detail screen.
- Detail can be placed underneath the list, which conflicts with the desired "detail screen" mental model.
- There is no previous/next navigation through the selected document list.
- Review is read-only inspection, but document processing actions happen in both list and detail.

Invoice review currently mostly matches this behavior:

- It has a list page.
- Clicking an item opens a detail screen.
- Review happens on the detail screen.
- Previous/next navigation exists when opened with queue context.

Invoice review still has gaps relative to the desired behavior:

- The list context is implicit in URL search params and renderer state, not represented by a generic list/detail contract.
- The detail route does not visibly communicate position, for example `3 of 18`.
- Previous/next behavior is tied to review queue routes only, not to a reusable list context.
- Row activation requires clicking the vendor link rather than the entire row.
- The queue list and detail page are implemented as separate one-off components, so documents cannot reuse the same behavior without duplicating logic.

## Design Decisions

### Decision: Use One Shared Interaction Pattern

Documents and invoice items should share the same interaction contract:

- list route defines a collection
- selected item has a stable identity
- detail screen receives collection context
- detail screen can navigate previous/next within that collection
- detail body remains feature-specific

This gives users one mental model while still allowing document detail and invoice item detail to show very different content.

### Decision: Prefer A Real Detail Screen Over Details Below A List

For central review workflows, row activation should open a detail screen rather than relying on a panel below the list.

Reasoning:

- It prevents the selected detail from being hidden beneath long tables on smaller windows.
- It leaves enough space for dense document or invoice item detail.
- It makes previous/next review controls predictable.
- It aligns documents with the existing invoice review flow.

The wide-screen master/detail layout can still be considered later as an optimization, but it should not be the only way to reach detail.

### Decision: Make The Entire Row Clickable

The consistent selection behavior should be that clicking anywhere on a list row opens the detail screen.

Requirements:

- The row should have a clear hover and focus state.
- Keyboard activation should work from the row.
- Nested actions, such as an overflow menu, must not also trigger row navigation.
- The row should still contain normal text and badges; it does not need a visible link around only one field.

This applies to both document lists and invoice item lists.

### Decision: Keep List And Detail Content Flexible

The shared component should own structure and behavior, not domain rendering.

Shared responsibilities:

- list shell and empty state placement
- row activation contract
- selected item identity
- detail header slots
- source document panel structure
- previous/next controls
- current position text
- responsive layout rules
- loading and not-found states

Domain responsibilities:

- document columns and row metadata
- invoice item columns and row metadata
- invoice review form
- process, delete, save, accept, reject actions

### Decision: Use One SourceDocumentPanel

Invoice item detail and document detail should share the same source document concept.

For invoice item detail, the panel shows the document that produced the invoice item. For document detail, the panel shows the selected document itself. The surrounding detail body changes, but the source document display should stay consistent.

Initial text-only content:

- original file name
- storage path or document location when useful
- source label
- processing status
- imported date
- processing completed date
- processor version
- SHA-256 when useful
- latest processing error
- actions such as `View document`, `Process`, or `Re-process` supplied through slots

The component should be named around its role, for example `SourceDocumentPanel`, rather than having separate "source" and "document" panels for different flows.

Future extension:

- The panel can grow from metadata-only display into a document preview surface.
- Preview support should not change the conceptual role of the component.
- If preview is added, the same component should still serve invoice item detail and document detail.
- Preview controls such as page, zoom, open externally, or text evidence can be added inside or adjacent to the panel when the document-viewing requirements are clearer.

### Decision: Provide Generic List Action Placement

The shared list shell should provide predictable places for actions even if each list supplies different actions.

Generic action areas:

- page-level actions near the list title, for example import, export, or process selected
- optional toolbar actions above the list, later used for filtering and sorting
- row-level overflow actions for item-specific commands
- optional bulk-action placement if multi-select is added later

The first version should not overbuild filtering, sorting, or bulk selection. It should reserve the toolbar slot so those features can be added without changing the surrounding layout.

Document-specific actions can include process/re-process and delete. Invoice-item-specific row actions may be minimal at first because review decisions belong on the detail screen.

### Decision: Treat Documents As Inspection, Invoice Items As Review

Documents and invoice items should not be forced into identical detail bodies.

Document detail should optimize for:

- file identity
- processing state
- provenance and errors
- linked extracted items
- document-level actions

Invoice item detail should optimize for:

- editable extracted facts
- tax relevance
- review decision
- source evidence
- notes

The common layer should make both feel like the same navigation experience, not the same page.

### Decision: Auto-Advance After Review Decisions

Accepting or rejecting an invoice item should always advance to the next item in the current displayed list when one exists.

If there is no next item, the detail screen should return to the list or show a clear completion state. The exact completion treatment can be decided when designing the invoice item detail.

### Decision: Previous/Next Uses The Currently Displayed List

Previous and next navigation should traverse the list as the user saw it when opening the detail screen.

For the first implementation, keep this simple by making central review collections addressable with route and search parameters. The detail screen should reconstruct the collection from those parameters instead of carrying a hidden in-memory object.

Examples:

- pending invoice items for a tax year are described by year and review status
- documents are described by the document list route and its current search parameters
- later filters and sorting should be encoded in the list URL before the detail screen depends on them

Avoid using route state for core previous/next behavior. Route state is useful for transient UI hints, but it makes detail navigation harder to reload, share, and test.

### Decision: No Backwards Compatibility Requirement For Document Selection

The current `/documents?document=...` selection model does not need to be preserved.

Documents can move to a new detail route such as `/documents/:documentId` without compatibility redirects. This keeps the design simpler and avoids supporting two document selection models.

## Proposed Shared Concepts

### ReviewCollection

A review collection is the list context that detail navigation uses.

Examples:

- all imported documents
- pending invoice items for 2025
- accepted invoice items for 2025
- rejected invoice items for 2025
- later: search results, recent imports, low-confidence items

Minimum shape:

```ts
type ReviewCollection<Item> = {
  id: string;
  label: string;
  items: Item[];
  listHref: string;
  getItemId: (item: Item) => string;
  getItemHref: (item: Item) => string;
};
```

Collection identity should be derived from route/search parameters, not from non-addressable route state.

### ReviewList

Reusable list shell for collection pages.

Responsibilities:

- render title, count, and page-level action slot
- render an optional toolbar slot for future filters and sorting
- render empty state
- render list/table/card rows through a domain slot
- activate an item by clicking the entire row
- preserve collection context in the detail URL
- provide a row action slot that does not trigger row navigation

Suggested location:

- generic list/detail components: `app/renderer/components/review`
- document-specific composition: document view/component files that import the generic review components
- invoice-item-specific composition: invoice review view/component files that import the generic review components

The generic folder should contain reusable review workflow structure, not document or invoice business rules.

### ReviewDetail

Reusable detail shell for selected items.

Responsibilities:

- render back-to-list link
- show collection label and item position
- render previous/next controls
- provide stable primary and secondary action slots
- provide a consistent detail content area
- keep navigation controls visible and discoverable
- support always-advance behavior after domain review actions

### SourceDocumentPanel

Shared source document display used by both document detail and invoice item detail.

Responsibilities:

- render document identity and processing metadata consistently
- show processing errors in a standard location
- provide action slots for document-specific commands
- start as a text-first panel
- allow a future document preview without creating a separate component family

Usage:

- document detail: `SourceDocumentPanel` describes the selected document
- invoice item detail: `SourceDocumentPanel` describes the source document for the selected invoice item

### Detail Body Slots

The detail body should be composed with slots so the shell can stay generic.

Potential slots:

- `summary`: compact identity and status
- `source`: usually `SourceDocumentPanel`
- `main`: primary detail or form
- `actions`: domain-specific commands
- `related`: linked records such as extracted invoice items

The shell should not know whether the selected item is editable.

## Responsive Direction

Minimum supported behavior:

- The list page must be usable in the current app shell without horizontal page scrolling.
- Row text must wrap or truncate intentionally.
- Detail must never be discoverable only by scrolling below a long list.
- Detail pages may stack sections on narrow windows.
- Previous/next and primary actions should remain near the top or bottom of the detail screen in a predictable place.

Recommended layout:

- List route: full-width list with optional filters and summary.
- Detail route:
  - desktop: source/context column plus main detail column when useful
  - narrow: summary, actions, source, main detail in a single column

Documents may use a denser detail layout than invoice review, but both should share the same surrounding detail shell.

## Open Questions

Resolved decisions:

1. Documents can use a new detail route. No backwards compatibility with `/documents?document=...` is required.
2. Keep list context simple by encoding collection parameters in the URL. Do not rely on route state for core previous/next navigation.
3. Accepting or rejecting an invoice item should always advance.
4. Previous/next should traverse what is currently displayed in the list. Future filters and sorting need URL parameters before detail navigation depends on them.

Remaining open question:

1. Which detail action areas should be generic versus domain-specific should be decided while designing each concrete list/detail pair. The generic layer should start with slots, then become more opinionated only where both documents and invoice items need the same behavior.

## Initial Recommendation

Use the invoice review flow as the baseline because it already matches the desired behavior more closely:

- list page
- detail route
- review on detail
- previous/next with collection context

Then adapt documents toward that model:

- keep `/documents` as the document list
- add a document detail screen
- move document metadata and linked invoice items into that screen
- add previous/next document navigation
- avoid placing the only detail view underneath the list

The generic components should be designed around collection context and detail navigation first. Rendering flexibility should come from slots, not from trying to make documents and invoice items share the same fields or visual density.

Place the generic pieces in `app/renderer/components/review` so the feature has a clear home and can be specialized by document and invoice item views.
