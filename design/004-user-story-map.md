# Deductions User Story Map

## Purpose

Deductions helps people in Germany collect invoices and receipts that may be relevant for income tax deductions throughout the year.

The app is not a full tax declaration assistant. Its job is to reduce the manual burden of finding, collecting, classifying, explaining, and exporting deduction-relevant invoices so the user can hand the result to a tax consultant or use it while preparing their own tax declaration.

## Problem

People often know that some expenses may reduce taxable income, but the supporting documents are scattered across email inboxes, online shops, PDFs, photos, local folders, and paper receipts.

This creates a recurring failure mode:

1. The user postpones collection until close to the tax deadline.
2. The user has to remember what they bought and why it was tax-relevant.
3. The user searches across many sources under time pressure.
4. Potentially deductible items are missed or cannot be justified.
5. Even when a tax consultant files the declaration, the collection work still falls on the user.

The app should move this work from a late, stressful, memory-based task into a regular, assisted, evidence-based process.

## Product Goals

1. Capture potentially deductible invoices continuously throughout the year.
2. Support both manual uploads and automated collection from connected sources.
3. Extract structured invoice data with AI and document parsing.
4. Suggest tax-relevant categories and deduction reasons.
5. Make uncertainty explicit so the user can review, correct, or reject suggestions.
6. Preserve invoice copies alongside structured metadata.
7. Export a clear package for a tax consultant or for self-preparation.
8. Avoid positioning the app as final tax advice or a complete tax filing product.

## Non-Goals

- Completing or submitting the German income tax declaration.
- Calculating final tax liability or refund.
- Replacing a tax consultant.
- Guaranteeing that an item is deductible.
- Supporting business bookkeeping as a full accounting system.
- Optimizing every possible German tax case in the first version.

## Primary Users

### Salaried Employee

Has work-related expenses such as books, office supplies, professional training, commuting-related documents, home office equipment, or professional memberships. Wants to avoid forgetting small but valid items.

### Employee With Tax Consultant

Does not want to file the tax declaration personally, but still has to provide the consultant with relevant invoices and explanations.

### Side-Income Or Self-Employed User

May have both private and business-adjacent purchases. This user is valuable but may expand scope significantly because business expenses, VAT, and bookkeeping expectations can turn the product into accounting software.

## Tax Framing To Validate

The first product language should stay conservative: "possibly deductible", "suggested category", and "reason to review" are safer than "deductible".

Useful German tax buckets to validate with a tax expert:

- Werbungskosten, for income-related employment expenses.
- Sonderausgaben, for certain private expenses that tax law treats specially.
- Außergewöhnliche Belastungen, for exceptional burdens under specific conditions.
- Haushaltsnahe Dienstleistungen and Handwerkerleistungen, where invoices and non-cash payment evidence matter.

Source notes:

- ELSTER help describes household services and tradesperson services and notes that invoice and account payment evidence are required for these cases: https://www.elster.de/elsterweb/helpGlobal?themaGlobal=help_est_ufa_10_2025
- The Federal Ministry of Finance tax guidelines for § 33 EStG describe außergewöhnliche Belastungen as expenses above the usual burden under specific conditions: https://ao.bundesfinanzministerium.de/esth/2024/A-Einkommensteuergesetz/IV-Tarif-31-34b/Paragraf-33/inhalt.html

These notes are product discovery context, not legal advice. The app should keep a reviewed tax taxonomy in configuration or content files so it can be updated when law, forms, or consultant guidance changes.

## Desired Output

At export time, the app should produce:

1. A CSV or Excel file containing one row per accepted item.
2. Copies of the corresponding invoices or receipts.
3. A stable identifier linking each spreadsheet row to the invoice copy.
4. The extracted invoice facts: vendor, date, amount, currency, tax/VAT if available, document source, and file name.
5. The suggested or confirmed tax category.
6. A user-visible reason why the item may be relevant.
7. Review status and confidence indicators.
8. Optional user notes for the tax consultant.

## Story Mapping Method

We will build the map in four passes:

1. Define the user journey backbone.
2. Add user tasks under each journey step.
3. Add stories under each task.
4. Slice the map horizontally into coherent releases.

The map should be organized around what the user is trying to accomplish, not around internal implementation areas such as OCR, LLM prompts, IPC, database tables, or integrations.

## Draft Story Map

### 1. Set Up Deduction Collection

User tasks:

- Create or open a local deduction workspace.
- Choose the relevant tax year.
- Define the user's tax situation at a high level.
- Decide whether the app is used for self-preparation or for a tax consultant handover.
- Review privacy and local storage expectations.

Stories:

- As a user, I can create a workspace for one tax year so collected invoices stay organized.
- As a user, I can select the tax year so exports and reminders use the right period.
- As a user, I can choose a simple profile such as employee, employee with consultant, or self-employed/side income so the app can adjust its suggestions.
- As a user, I can see where my documents are stored so I understand the privacy model.
- As a user, I can change my setup choices later so early mistakes do not lock me in.

### 2. Add Invoice Sources

User tasks:

- Upload invoice files manually.
- Add photos or scans of paper receipts.
- Import documents from a local folder.
- Connect email for invoice discovery.
- Connect vendor accounts such as Amazon.
- See when each source was last checked.

Stories:

- As a user, I can drag PDF, image, and email attachment files into the app so I can start without configuring integrations.
- As a user, I can scan or photograph a paper receipt so offline purchases can be included.
- As a user, I can select a folder to import existing invoices so setup is not limited to new files.
- As a user, I can connect an email account so the app can find invoice-like messages and attachments.
- As a user, I can connect an online shop account so invoices can be downloaded automatically where supported.
- As a user, I can pause or remove a source so I stay in control of automated collection.

### 3. Collect Candidate Invoices

User tasks:

- Run manual imports.
- Run scheduled source checks.
- Detect invoice-like documents.
- Avoid duplicate documents.
- Track source status and failures.
- Keep rejected documents out of the main workflow.

Stories:

- As a user, I can import a batch of files and see which documents were accepted, skipped, or failed.
- As a user, the app can detect likely invoices so unrelated documents do not flood the review queue.
- As a user, duplicate invoices are detected so I do not review the same item twice.
- As a user, I can see why a document failed to import so I know whether to retry or ignore it.
- As a user, the app can check connected sources regularly so collection happens throughout the year.
- As a user, I can restore a rejected document so mistakes are reversible.

### 4. Extract Invoice Facts

User tasks:

- Extract vendor, date, amount, and invoice number.
- Detect line items when useful.
- Read VAT and currency where available.
- Preserve the original document.
- Show extraction confidence.
- Let the user correct extracted fields.

Stories:

- As a user, I can see extracted invoice facts next to the source document so I can verify them quickly.
- As a user, I can edit extracted fields so OCR or AI mistakes do not pollute the export.
- As a user, I can mark a document as unreadable or incomplete so it does not block other work.
- As a user, I can see low-confidence fields highlighted so I spend attention where it matters.
- As a user, corrected fields are saved so the final export reflects my review.

### 5. Decide Tax Relevance

User tasks:

- Classify the invoice into a tax-relevant category.
- Identify personal/private items that should be excluded.
- Explain why the item may be deductible.
- Capture mixed-use or partial-use context.
- Ask the user for missing context.
- Escalate uncertain items for tax consultant review.

Stories:

- As a user, I can see a suggested deduction category so I do not start from a blank form.
- As a user, I can see the suggested reason in plain language so I can judge whether it matches my situation.
- As a user, I can override the category so the app does not force a wrong suggestion.
- As a user, I can mark an invoice as not tax-relevant so it stays out of the export.
- As a user, I can add a note explaining work relevance so my future self or consultant understands the decision.
- As a user, I can mark mixed-use items with a proposed percentage or note so ambiguous cases are not hidden.
- As a user, I can flag an item for consultant review so uncertain cases are separated from confident ones.

### 6. Review Progress During The Year

User tasks:

- See how many invoices are collected and reviewed.
- Resolve pending review items.
- Receive reminders to collect invoices.
- Search and filter collected documents.
- Check coverage by source and category.
- Prepare before deadlines.

Stories:

- As a user, I can see a dashboard of pending, accepted, rejected, and uncertain items so I know the state of my tax-year collection.
- As a user, I can filter by source, month, category, and review status so I can process documents in batches.
- As a user, I receive periodic reminders so invoice collection does not become a last-minute task.
- As a user, I can search by vendor or amount so I can find a specific invoice.
- As a user, I can see stale or failing sources so automation does not silently stop working.

### 7. Export Handover Package

User tasks:

- Select the tax year and item statuses to export.
- Generate CSV or Excel.
- Bundle invoice copies.
- Include notes and reasons.
- Validate that every exported row has a document.
- Share or save the export package.

Stories:

- As a user, I can export accepted items to CSV so the data can be opened in common tools.
- As a user, I can export accepted items to Excel so a tax consultant can work with a familiar format.
- As a user, invoice copies are included with stable file names so spreadsheet rows can be matched to evidence.
- As a user, the export includes reasons and notes so the consultant does not have to ask me to reconstruct context.
- As a user, the app warns me before export if accepted items are missing files or required fields.
- As a user, I can create a ZIP package so handover is a single artifact.

### 8. Maintain Trust And Control

User tasks:

- Understand what AI did.
- Review automation decisions.
- Manage sensitive data.
- Delete documents and sources.
- Update tax rules and categories.
- Keep an audit trail of user decisions.

Stories:

- As a user, I can distinguish extracted facts from AI suggestions so I know what has been inferred.
- As a user, I can see when an item was imported, reviewed, edited, or exported so decisions are traceable.
- As a user, I can delete an invoice and its extracted data so I control sensitive documents.
- As a user, I can export my raw archive so I am not locked into the app.
- As a user, tax category definitions can be updated so the product does not hard-code stale assumptions.

## Candidate Release Slices

### Slice 1: Manual MVP

Goal: Prove that the app can turn user-provided invoices into a useful tax handover list.

Include:

- Local workspace for one tax year.
- Manual PDF/image upload.
- Original file preservation.
- Basic extraction of vendor, date, amount, and invoice number.
- Manual category selection.
- Manual reason and notes.
- Review statuses: pending, accepted, rejected, needs consultant review.
- CSV export.
- Invoice copy export with stable file names.

Defer:

- Email scanning.
- Amazon or vendor integrations.
- Automatic deduction categorization beyond simple suggestions.
- Scheduled reminders.
- Multi-year reporting polish.

### Slice 2: Assisted Review

Goal: Reduce user effort after manual upload.

Include:

- AI category suggestions.
- AI reason drafts.
- Confidence and uncertainty display.
- Duplicate detection.
- Batch review and filtering.
- Excel export.
- ZIP package generation.

### Slice 3: Habit Formation

Goal: Make collection happen regularly throughout the year.

Include:

- Reminder cadence.
- Dashboard by month, source, category, and review status.
- Import from watched local folders.
- Better search.
- Export validation.

### Slice 4: Automated Collection

Goal: Reduce the need for users to find invoices manually.

Include:

- Email scanning.
- Email attachment import.
- Vendor account integrations, starting with one high-value provider.
- Source health monitoring.
- Automated periodic checks.

### Slice 5: Taxonomy And Consultant Workflow

Goal: Improve fit for real consultant handover.

Include:

- Consultant-oriented export templates.
- Configurable category taxonomy.
- Consultant review flags.
- Reusable explanation snippets.
- Tax-year rule updates.
- Optional consultant feedback import.

## Highest-Risk Assumptions

1. Users will trust the app with sensitive invoices if storage and AI processing are transparent.
2. Manual upload plus export is valuable enough before source automation exists.
3. AI can produce useful deduction reasons without overclaiming legal certainty.
4. Tax consultants will accept or at least tolerate the generated CSV/Excel plus invoice bundle.
5. Email and vendor integrations are technically feasible without creating unacceptable maintenance or security overhead.
6. The product can stay focused on invoice collection without drifting into full tax filing or accounting.

## Questions For The Next Mapping Session

1. Who is the first target user: salaried employees, people with tax consultants, self-employed users, or another group?
2. Should the MVP optimize for local-only privacy, cloud sync, or a hybrid model?
3. Should AI processing happen locally where possible, in the cloud, or behind a user-controlled setting?
4. Which export format matters first: CSV, Excel, ZIP with documents, or a specific consultant handover format?
5. Which tax categories should be in the first reviewed taxonomy?
6. How much responsibility should the app take for deduction suggestions: conservative hints, ranked suggestions, or detailed explanations?
7. What is the first automated source worth building: email, Amazon, watched folders, or another vendor?
8. Should the app support multiple people or households in one workspace?
9. What is the retention model for invoices after a tax year is exported?
10. What is the success metric for the first release: fewer missed invoices, faster handover, more regular collection, or consultant acceptance?

## Proposed Next Step

Use this draft to run a 60-minute story-mapping pass:

1. Pick the first target user.
2. Walk through that user's year from first setup to final export.
3. Remove activities that do not matter for that user.
4. Mark the thinnest complete slice that creates a useful handover package.
5. Turn that slice into implementation epics and acceptance tests.
