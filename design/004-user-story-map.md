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

### Employee With Tax Consultant

An employee with income from nichtselbstständige Arbeit who uses a tax consultant for the actual tax declaration.

This user still has to collect invoices, receipts, and explanations personally because the tax consultant cannot know which purchases were made, where the supporting documents are, or why a specific item may be relevant. The app should help this user produce a clean handover package: structured export, invoice copies, categories, reasons, and notes for uncertain cases.

Complexity:

- This is a good first persona because the output is concrete: a consultant-ready package.
- The app must clearly separate user-confirmed facts from AI suggestions so the consultant can review them.
- Consultant expectations may vary, so export structure and category naming should be easy to adapt.

### Employee Who Self-Files Tax Declaration

An employee with income from nichtselbstständige Arbeit who prepares their own tax declaration, for example with ELSTER or consumer tax software.

This user needs the same collection and classification help, but the final workflow is different. Instead of handing a package to a tax consultant, they use the exported data while entering their declaration themselves. They need confidence that relevant invoices were not missed, that categories make sense, and that each item has enough context to decide where it belongs.

Complexity:

- The app may need stronger guidance and clearer explanations because there is no consultant acting as a reviewer.
- Mapping app categories to tax declaration concepts may become more important.
- There is a higher risk that users interpret suggestions as tax advice, so wording and disclaimers need care.

### Side-Income Or Self-Employed User

Has freelance, self-employed, rental, creator, or other side-income activity, or is fully self-employed.

This user may have both private deductions and business-related expenses. They may need to separate private, employment-related, and business-context purchases. They may also care about recurring subscriptions, equipment, travel, software, invoices issued to customers, and documents that look more like bookkeeping records than private tax receipts.

Deductions should still focus on collecting potentially deductible invoices and preparing an export package, not becoming a full bookkeeping or tax filing system.

Complexity:

- This persona can greatly expand scope because business expenses, VAT, bookkeeping, profit calculation, and record retention expectations may enter the product.
- Mixed-use purchases are more common and harder to explain.
- Supporting this persona well may require separate workflows, categories, and export formats from the employee-focused app.
- This should likely be treated as a later expansion unless the product deliberately moves toward accounting-adjacent use cases.

## User Behavior Modes

These modes are separate from the personas above. The app should support both modes for each persona.

### Deadline-Driven Catch-Up User

Only starts collecting deduction-relevant invoices shortly before the tax declaration deadline or shortly before sending documents to a tax consultant.

This user needs fast recovery from a messy year: bulk import, email and folder search, duplicate detection, quick triage, filtering, and a clear path to export. They are less focused on habit formation during the first session and more focused on reducing immediate stress and avoiding missed documents.

Product implications:

- Batch import and batch review matter early.
- Search and source coverage are critical.
- The app should make progress visible so the user knows when the handover package is good enough.
- Automation can still help, but it must work with historical documents, not only future collection.

### Year-Round Optimizer

Collects and reviews invoices continuously during the year to avoid a deadline rush.

This user benefits from reminders, scheduled source checks, lightweight monthly review, dashboards, and low-friction confirmation of AI suggestions. They may be more willing to connect sources because the value comes from reducing repeated effort over time.

Product implications:

- Reminders, source health, and recurring review workflows matter.
- The app should make small regular sessions efficient.
- Progress views should show what is already collected and what still needs attention.
- Automated collection is especially valuable for this mode.

## Story Map

Steps:

1. Define Tax Situation.
2. Choose Invoice Sources.
3. Import Candidate Invoices.
4. Extract Invoice Facts.
5. Decide Tax Relevance.
6. Review Progress During The Year.
7. Export Handover Package.

Horizontal concerns mentioned in a separate section, such as trust and privacy concerns, apply across all steps.

### 1. Define Tax Situation

User tasks:

- Create or open a local deduction workspace.
- Define the user's tax situation at a high level.
- Decide whether the app is used for self-preparation or for a tax consultant handover.
- Capture enough work and life context to make deduction suggestions useful.
- Review privacy and local storage expectations.

Tax year should not be a setup choice. Invoices should automatically be assigned to the relevant tax year based on invoice date or another validated document date. Manual tax-year override belongs in review/control workflows for cases where extraction or date interpretation is wrong.

Stories:

- [Slice 1] As a user, I can create a workspace so collected invoices and receipts stay organized across tax years.
- [Slice 1] As a user, I can choose a simple profile such as employee, employee with consultant, or self-employed/side income so the app can adjust its suggestions.
- [Slice 1] As a user, I can describe my profession and work context so the app can judge work-related relevance more accurately.
- [Slice 1] As a user, I can mark household, medical, donation, insurance, or other private deduction contexts that may apply so the app does not focus only on work-related expenses.
- [Slice 1] As a user, I can see where my documents are stored so I understand the privacy model.
- [Slice 2] As a user, I can change my setup choices later so early mistakes do not lock me in.

### 2. Choose Invoice Sources

User tasks:

- Choose image or receipt photo import.
- Choose local folder import.
- Connect vendor accounts such as Amazon.
- Connect later additional sources such as email.
- See when each source was last checked.

Stories:

- [Slice 2] As a user, I can choose image or receipt photo import so offline purchases can be included.
- [Slice 2] As a user, I can select a folder to import existing invoices so setup is not limited to new files.
- [Slice 3] As a user, I can connect an Amazon account so invoices can be downloaded automatically where supported.
- [Slice 3] As a user, I can connect later additional sources such as email so the app can find invoice-like messages and attachments.
- [Slice 3] As a user, I can pause or remove a source so I stay in control of automated collection.

### 3. Import Candidate Invoices

User tasks:

- Import PDFs manually.
- Import images or receipt photos.
- Run local folder imports.
- Run scheduled source checks.
- Detect invoice-like documents.
- Avoid duplicate documents.
- Track source status and failures.
- Keep rejected documents out of the main workflow.

Stories:

- [Slice 1] As a user, I can import a batch of PDFs and see which documents were accepted, skipped, or failed.
- [Slice 2] As a user, I can import images or receipt photos so offline purchases can be included.
- [Slice 1] As a user, the app can detect likely invoices so unrelated documents do not flood the review queue.
- [Slice 2] As a user, duplicate invoices are detected so I do not review the same item twice.
- [Slice 2] As a user, I can see why a document failed to import so I know whether to retry or ignore it.
- [Slice 3] As a user, the app can check connected sources regularly so collection happens throughout the year.
- [Slice 2] As a user, I can restore a rejected document so mistakes are reversible.

### 4. Extract Invoice Facts

User tasks:

- Extract vendor, date, amount, and invoice number.
- Detect line items when useful.
- Read VAT and currency where available.
- Preserve the original document.
- Show extraction confidence.
- Let the user correct extracted fields.

Stories:

- [Slice 1] As a user, I can see extracted invoice facts next to the source document so I can verify them quickly.
- [Slice 1] As a user, I can edit extracted fields so OCR or AI mistakes do not pollute the export.
- [Slice 1] As a user, I can mark a document as unreadable or incomplete so it does not block other work.
- [Slice 2] As a user, I can see low-confidence fields highlighted so I spend attention where it matters.
- [Slice 1] As a user, corrected fields are saved so the final export reflects my review.

### 5. Decide Tax Relevance

User tasks:

- Classify the invoice into a tax-relevant category.
- Identify personal/private items that should be excluded.
- Explain why the item may be deductible.
- Capture mixed-use or partial-use context.
- Decide whether an item may need to be deducted across several years.
- Ask the user for missing context.
- Escalate uncertain items for tax consultant review.

Stories:

- [Slice 1] As a user, I can see a suggested deduction category so I do not start from a blank form.
- [Slice 1] As a user, I can see the suggested reason in plain language so I can judge whether it matches my situation.
- [Slice 1] As a user, I can override the category so the app does not force a wrong suggestion.
- [Slice 1] As a user, I can mark an invoice as not tax-relevant so it stays out of the export.
- [Slice 1] As a user, I can add a note explaining work relevance so my future self or consultant understands the decision.
- [Slice 2] As a user, I can mark mixed-use items with a proposed percentage or note so ambiguous cases are not hidden.
- [Slice 2] As a user, I can mark items that may need deduction across several years so the app does not treat every invoice as a one-year item.
- [Slice 1] As a user, I can flag an item for consultant review so uncertain cases are separated from confident ones.

### 6. Review Progress During The Year

User tasks:

- See how many invoices are collected and reviewed.
- Resolve pending review items.
- Receive reminders to collect invoices.
- Search and filter collected documents.
- Check coverage by source and category.
- Prepare before deadlines.

Stories:

- [Slice 2] As a user, I can see a dashboard of pending, accepted, rejected, and uncertain items so I know the state of my tax-year collection.
- [Slice 2] As a user, I can filter by source, month, category, and review status so I can process documents in batches.
- [Future Option] As a user, I receive periodic reminders so invoice collection does not become a last-minute task.
- [Slice 2] As a user, I can search by vendor or amount so I can find a specific invoice.
- [Slice 3] As a user, I can see stale or failing sources so automation does not silently stop working.

### 7. Export Handover Package

User tasks:

- Select the tax year and item statuses to export.
- Generate CSV or Excel.
- Bundle invoice copies.
- Include notes and reasons.
- Validate that every exported row has a document.
- Share or save the export package.

Stories:

- [Slice 1] As a user, I can export accepted items to CSV so the data can be opened in common tools.
- [Slice 2] As a user, I can export accepted items to Excel so a tax consultant can work with a familiar format.
- [Slice 1] As a user, invoice copies are included with stable file names so spreadsheet rows can be matched to evidence.
- [Slice 1] As a user, the export includes reasons and notes so the consultant does not have to ask me to reconstruct context.
- [Slice 2] As a user, the app warns me before export if accepted items are missing files or required fields.
- [Slice 2] As a user, I can create a ZIP package so handover is a single artifact.

## Stories By Release Slices

### Slice Alignment

| Journey Step                    | Slice 1: AI-Assisted Manual MVP                                                                                           | Slice 2: Review And Export Maturity                                                                             | Slice 3: Automated Collection                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Define Tax Situation            | Basic persona, filing workflow, profession/work context, relevant private deduction contexts, privacy/storage visibility. | Edit setup/context after initial use.                                                                           | Source-driven context inference from connected accounts.                            |
| Choose Invoice Sources          | None.                                                                                                                     | Image or receipt photo import; local folder import.                                                             | Amazon account connection, later additional source connection, source pause/remove. |
| Import Candidate Invoices       | Manual PDF import, invoice-like document detection, import result summary.                                                | Image/receipt photo import, duplicate detection, failed-import explanation, restore rejected/skipped documents. | Scheduled source checks, source health.                                             |
| Extract Invoice Facts           | AI extraction of vendor, date, amount, currency, invoice number, metadata; user correction.                               | Confidence display, low-confidence prioritization; OCR/image extraction support.                                | Extraction from Amazon and later source-downloaded invoices.                        |
| Decide Tax Relevance            | AI category suggestion, AI reason suggestion, user override, reject item, add note, flag consultant review.               | Mixed-use handling, multi-year deduction handling, richer uncertainty handling.                                 | Use source history to improve categorization.                                       |
| Review Progress During The Year | Basic pending/accepted/rejected/consultant-review counts.                                                                 | Dashboard by month/source/category/status, filtering, search.                                                   | Stale/failing source visibility.                                                    |
| Export Handover Package         | CSV export, invoice copies, stable file names, reasons/notes included.                                                    | Excel export, ZIP package, export validation.                                                                   | Include source provenance from automated imports.                                   |

### Slice 1: AI-Assisted Manual MVP

Goal: Prove that the app can turn user-provided invoices into a useful tax handover list with enough automation to deliver the core product promise.

Include:

- Local workspace that organizes invoices by tax year from invoice dates.
- Manual PDF import.
- Original file preservation.
- AI-assisted extraction of vendor, date, amount, currency, invoice number, and source file metadata.
- AI-assisted category and deduction-reason suggestions, clearly marked as suggestions that require user review.
- Manual correction of extracted fields, assigned tax year, category, reason, and notes.
- Review statuses: pending, accepted, rejected, needs consultant review.
- CSV export.
- Invoice copy export with stable file names.

### Slice 2: Review And Export Maturity

Goal: Make review faster, make export more useful, and support both catch-up and year-round behavior after invoices are in the app.

Include:

- Confidence and uncertainty display.
- Duplicate detection.
- Batch review and filtering.
- Dashboard by month, source, category, and review status.
- Better search.
- Export validation.
- Excel export.
- ZIP package generation.

### Slice 3: Automated Collection

Goal: Reduce the need for users to find invoices manually.

Include:

- Amazon account integration as the first automated source.
- Later additional source integrations.
- Source health monitoring.
- Automated periodic checks.

### Future Options

Habit formation and consultant-specific workflow improvements are still useful directions, but they are not the focus of the current story map.

Possible future option: Habit Formation.

- Reminder cadence.
- Lightweight monthly review.
- Import from watched local folders.
- Year-round progress nudges.

Possible future option: Taxonomy And Consultant Workflow.

- Consultant-oriented export templates.
- Configurable category taxonomy.
- Consultant review flags.
- Reusable explanation snippets.
- Tax-year rule updates.
- Optional consultant feedback import.

Possible future option: Zusammenveranlagung.

- Joint filing context for married couples.
- Person-level assignment such as spouse A, spouse B, or shared.
- Household-level deduction context where needed.

## Horizontal Concerns

These concerns apply across the whole journey rather than belonging to one chronological step. We will expand this section as we discover more items.

### Trust

The app should make its decisions inspectable. Users need to understand which facts came from the invoice, which fields were extracted by automation, which conclusions were suggested by AI, and which decisions were confirmed by the user.

Stories:

- As a user, I can distinguish extracted facts from AI suggestions so I know what has been inferred.
- As a user, I can see when an item was imported, reviewed, edited, or exported so decisions are traceable.
- As a user, I can see why an item is suggested as potentially relevant so I can decide whether to accept it.

### Privacy

Invoices contain sensitive personal, financial, medical, household, and professional information. The app should make storage, processing, source access, and AI usage explicit.

Stories:

- As a user, I can see where my documents and extracted data are stored so I understand the privacy model.
- As a user, I can decide whether cloud or external AI processing is allowed so sensitive documents are handled according to my expectations.
- As a user, I can disconnect an invoice source so ongoing access stops when I no longer want it.

### AI Transparency

AI should reduce effort without pretending to provide final tax advice. The app should show confidence, uncertainty, source evidence, and review state.

Stories:

- As a user, I can see confidence or uncertainty indicators so I know where review is most important.
- As a user, I can tell whether a deduction reason was generated by AI, written by me, or based on a reviewed template.
- As a user, I can flag uncertain items for consultant review so ambiguous cases are not hidden.

### Data Control

The user owns the outcome and the archive. The app should preserve originals, support deletion, and make export possible without lock-in.

Stories:

- As a user, I can delete an invoice and its extracted data so I control sensitive documents.
- As a user, I can export my raw archive so I am not locked into the app.
- As a user, invoice copies are preserved alongside structured data so the handover package remains evidence-based.

### Automation With User Override

The app should automate as much as possible, but the user must feel in control of the final outcome. Automation should propose, prefill, sort, and classify; the user should be able to inspect, correct, override, reject, or restore.

Stories:

- As a user, invoices are automatically assigned to a tax year based on invoice date so I do not have to set up years manually.
- As a user, I can override the assigned tax year so extraction mistakes or special cases can be corrected.
- As a user, I can override extracted fields, tax categories, deduction reasons, and review status so the final export reflects my judgment.
- As a user, I can restore rejected or skipped documents so automation mistakes are reversible.

### Holistic Deduction Coverage

The app should cover deduction-relevant documents holistically for the user, not only work-related expenses. For employees, this means Werbungskosten are important, but the app should also allow household services, tradesperson invoices, medical expenses, donations, insurance, childcare, care-related costs, and other applicable private deduction categories where relevant.

Stories:

- As a user, I can collect and review invoices across all deduction areas that may matter for my income tax declaration so the app does not artificially limit me to work-related expenses.
- As a user, I can see whether an item is being considered as work-related, household-related, medical, donation-related, insurance-related, or another relevant category so the rationale is clear.
- As a user, I can exclude categories that are irrelevant to my situation so holistic coverage does not create unnecessary review work.

### Taxonomy Maintenance

Tax categories, export expectations, and wording may change over time. The app should avoid hard-coding stale assumptions.

Stories:

- As a user, tax category definitions can be updated so the product does not rely on outdated assumptions.
- As a user, I can use category names and export fields that match my consultant or self-filing workflow.

## Draft Implementation Notes

These notes capture useful implementation-oriented ideas discovered during story mapping. They need refinement and validation before they should be treated as implementable requirements.

### Tax Framing To Validate

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

### Desired Output

At export time, the app should produce:

1. A CSV or Excel file containing one row per accepted item.
2. Copies of the corresponding invoices or receipts.
3. A stable identifier linking each spreadsheet row to the invoice copy.
4. The extracted invoice facts: vendor, date, amount, currency, tax/VAT if available, document source, and file name.
5. The suggested or confirmed tax category.
6. A user-visible reason why the item may be relevant.
7. Review status and confidence indicators.
8. Optional user notes for the tax consultant.

### Define Tax Situation Context

High-level context the app may need to capture:

Where possible, this context should be inferred or captured automatically from invoices, source metadata, prior user decisions, and import history instead of requiring upfront configuration. The user should only be asked when the app cannot infer context reliably or when a confirmation would materially improve the deduction assessment.

- User persona: employee with tax consultant, employee who self-files, side-income/self-employed user, or a combination.
- Filing unit: individual filing or Zusammenveranlagung for married couples, so the app can understand whether invoices and deduction contexts may belong to one or both spouses. This is currently a future option, not active Slice 1-3 scope.
- Employment context for nichtselbstständige Arbeit: profession, role, industry, work location pattern, home office situation, work equipment expectations, professional travel, professional education, memberships, and other recurring work-related costs.
- Filing workflow: self-filing, tax consultant handover, or undecided.
- Household and private deduction context: household services, tradesperson invoices, childcare, medical expenses, donations, insurance, care responsibilities, or other areas that may create deductible documents.
- Side-income context when applicable: type of activity, whether business-related invoices should be collected, and whether mixed private/business use is common.
- Review preference: conservative suggestions only, more active AI suggestions, or consultant-review-heavy workflow.

## Highest-Risk Assumptions

1. Users will trust the app with sensitive invoices if storage and AI processing are transparent.
2. AI-assisted manual upload plus export is valuable enough before source automation exists.
3. AI can produce useful extraction, categorization, and deduction-reason suggestions without overclaiming legal certainty.
4. Tax consultants will accept or at least tolerate the generated CSV/Excel plus invoice bundle as a useful handover package.
5. Amazon integration is technically feasible without creating unacceptable maintenance, privacy, or security overhead.
6. The app can support both deadline-driven catch-up and year-round optimization without splitting into two separate products.
7. The product can stay focused on invoice collection without drifting into full tax filing, bookkeeping, VAT handling, or refund calculation.
