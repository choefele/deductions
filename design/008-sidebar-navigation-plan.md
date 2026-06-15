# Sidebar Navigation Plan

## Purpose

Plan the next navigation structure before implementing the Documents screen and document processing workflow.

This plan focuses only on sidebar shape, route concepts, and ownership of review/navigation states. Document handling details are covered in `009-import-documents-plan.md`.

This is a design plan only. It does not implement routing, loaders, IPC, schema, or UI changes.

## Current Decisions

- Add an explicit `All years` sidebar item above the tax-year list.
- Use `Overview` instead of `Dashboard` for tax-year summary pages.
- Invoice and invoice-item review happens inside each tax year.
- There is no separate global `Review` sidebar section.
- Each tax year has `Overview`, `Review`, `Accepted`, and `Rejected`.
- Tax categories are not sidebar entries. Category browsing happens inside tax-year screens.
- `Documents` is a separate top-level sidebar item below tax years.
- `Sources` is not a sidebar item. Source filtering belongs in the Documents screen.
- The user/profile entry is reserved for future profile/settings behavior.

## Recommended Sidebar

```text
All years

Tax years
  2026
    Overview
    Review                5
    Accepted
    Rejected
  2025
    Overview
    Review                2
    Accepted
    Rejected

Documents                 2
```

The sidebar should stay focused on scope and workflow state:

- `All years`: cross-year statistics and overall progress.
- `Tax years`: year-specific workspaces.
- `Overview`: year summary, progress, totals, category breakdown, and recent activity.
- `Review`: invoices and invoice items that need user action for that year.
- `Accepted`: reviewed items that count toward the tax-year result and later export.
- `Rejected`: reviewed items kept for history/audit but excluded from export.
- `Documents`: imported file history and document-level failures.

Only two sidebar items should show badges:

- A tax-year `Review` badge counts unresolved invoice/item work for that year.
- The `Documents` badge counts imported documents with unresolved document-level problems, such as failed processing or ambiguous files.

## Why Review Is Per Tax Year

The user is trying to get a tax year ready. A global review queue would compete with tax-year navigation and force the user to choose between two places for the same work.

Per-year review keeps the workflow concrete:

```text
2026 > Review
  -> fix invoice/header/item issues
  -> accept or reject each item
  -> accepted items appear in 2026 results/export
```

Users can move items between `Review`, `Accepted`, and `Rejected` by fixing issues or changing review status. These are tax-year status views, not document-history views.

## Category Handling

Do not include category entries in the sidebar.

Category browsing and filtering should happen inside tax-year screens:

- `Overview` can show category breakdowns and category summary sections.
- `Review` can filter or group pending work by category.
- `Accepted` can browse accepted items by category.
- `Rejected` can filter rejected items by category or rejection reason.

This keeps the sidebar short and prevents it from mixing navigation hierarchy with table filters.

## Route Shape

Recommended route concepts:

```text
/
/years/:year
/years/:year/review
/years/:year/accepted
/years/:year/rejected
/documents
```

The current `/years/:year` route can become the tax-year `Overview` route. Existing category routes can be removed or made internal links/filters once category browsing moves into the status screens.

## Implementation Order

Recommended first navigation slice:

1. Add the explicit `All years` sidebar item.
2. Rename tax-year `Dashboard` display text to `Overview`.
3. Remove the global `Review` sidebar group.
4. Remove category entries from the tax-year sidebar tree.
5. Add `Review`, `Accepted`, and `Rejected` entries under each tax year.
6. Keep `Documents` as a top-level sidebar item with a placeholder route if the full Documents screen is not implemented yet.
7. Remove `Sources` from the sidebar.

This slice should make navigation simpler before the Documents screen is built.

## Follow-Up Plan

After this navigation change, implement `009-import-documents-plan.md`.

The navigation plan deliberately leaves source filtering, document status, processing history, and document detail behavior to that follow-up.
