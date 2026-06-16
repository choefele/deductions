# Document Processing Plan

## Purpose

Plan how imported PDF documents become invoice and invoice item drafts.

This plan builds on `009-import-documents-plan.md`. It assumes imported files already become durable `documents` rows and that invoice/item review happens in tax-year views.

This is a design plan only. It does not implement PDF extraction, AI access, schema changes, IPC, background jobs, or UI changes.

## Current Decisions

- Use PDF.js through `pdfjs-dist` for PDF text extraction.
- Run document processing in the Electron main process, not in the renderer.
- Keep the renderer non-blocking while documents process.
- Treat imported documents as the durable processing input.
- Use AI to convert extracted PDF text into structured invoice and invoice item drafts.
- Use a provider-neutral AI access layer so cloud LLMs and local LLMs can be swapped.
- Prefer the Vercel AI SDK for the first AI integration.
- Use developer-level AI provider configuration for the first processing slice.
- Use LM Studio with Gemma 4 as the initial test provider/model.
- Keep app-owned interfaces around PDF extraction and AI parsing so the package choice remains replaceable.
- Generated invoice items start as `pending`. AI should not directly create `accepted` or `rejected` items.
- Document-level failures stay on the document. Invoice/item review stays in tax-year views.

## Recommended Pipeline

There are two separate status tracks:

```text
documents.status
  imported -> processing -> processed
                         -> needs_review

invoice_items.reviewStatus
  pending -> accepted
          -> rejected
```

`documents.status` describes the file-level processing lifecycle. `invoice_items.reviewStatus` describes the user's tax-year decision for each extracted item. Do not use item review status to represent document processing failures.

Successful document path:

```text
importDocuments(filePaths)
  -> documents row with status imported
  -> enqueue document processing
  -> set document status processing
  -> extract PDF text with PDF.js
  -> parse invoice data with AI structured output
  -> validate and normalize parsed data
  -> write invoices and invoice_items in one transaction
  -> set document status processed
  -> tax-year Review views show generated pending items
```

User review path:

```text
generated invoice_items with reviewStatus pending
  -> user reviews and fills missing or uncertain data
  -> user accepts item
       -> item is included in the tax-year result/export
  -> user rejects item
       -> item is kept for history but excluded from the tax-year result/export
```

Failure path:

```text
processing error, no embedded text, no invoice found, no valid invoice items, invalid AI output, or ambiguous result
  -> set document status needs_review
  -> store a concise document-level error/next-action message
  -> keep the problem visible in Documents
```

Import should finish as soon as files are copied and document rows are created. Processing should be a follow-up job, not part of the import response.

`needs_review` should be relatively uncommon. It is for document-level problems that prevent useful invoice/item drafts from being created. If valid invoice items can be created, create them as `pending` even when some fields are uncertain or need user correction.

## PDF Text Extraction

Use PDF.js for digital PDFs that contain embedded text.

Recommended extraction steps:

1. Load the stored PDF from the profile document folder.
2. Use `getDocument` with file bytes rather than a renderer URL.
3. Iterate pages by page number.
4. Call `page.getTextContent()` for each page.
5. Normalize text into a stable app-owned shape.
6. Pass normalized page text to the AI parser.

App-owned normalized text shape:

```ts
type NormalizedDocumentText = {
  documentId: string;
  extractor: 'pdfjs';
  pageCount: number;
  pages: Array<{
    pageNumber: number;
    text: string;
    charCount: number;
  }>;
  totalCharCount: number;
};
```

`NormalizedDocumentText` is the cleaned extraction result, not raw PDF.js output. Keep this shape independent from PDF.js internals. PDF.js `TextContent` includes layout-oriented items, but the rest of the app should not depend directly on that object model.

Recommended first normalization should stay simple and compact. The goal is readable text for the AI parser, not perfect PDF layout reconstruction.

- Preserve page boundaries.
- Preserve line-ish grouping where possible.
- Collapse repeated whitespace.
- Use plain spaces because PDF.js normalizes whitespace in `getTextContent()`.
- Include page labels in the AI prompt, for example `--- Page 1 ---`.
- Drop empty lines and obvious duplicate whitespace-only fragments.
- Avoid preserving raw coordinates, font metadata, transform matrices, or every PDF.js text item in the AI prompt.
- Do not attempt complex table reconstruction in the first slice.

Keep AI input as small as practical. Smaller prompts should reduce processing time and cost, especially for local LLMs. The first implementation should rely on the model to infer invoice structure from concise page text rather than sending verbose layout metadata.

The normalizer can improve later if real invoice PDFs show recurring failures, for example by adding lightweight column hints for tables. That should be driven by test fixtures and observed extraction failures, not added upfront.

Do not add OCR in the first PDF.js slice. If a PDF has too little embedded text, mark the document `needs_review` with a message such as "No readable PDF text found. OCR is not supported yet." OCR should be a separate plan because it adds model/runtime, performance, and packaging questions.

## AI Package Decision

Recommended first choice: Vercel AI SDK.

Reasons:

- It provides a standardized language model interface across providers.
- It supports structured output with schemas, which fits invoice extraction better than free-form JSON parsing.
- It has first-party providers for common cloud models.
- It supports OpenAI-compatible providers, which is the practical compatibility path for local tools such as Ollama and LM Studio.
- It is small enough for this app's current need: a structured extraction call, not an agent framework.
- It does not require Vercel hosting, Next.js, or sending data to Vercel. It is only a TypeScript library inside the app.

Do not use LangChain or LlamaIndex for the first slice unless the scope grows into retrieval, multi-step agents, or tool-heavy workflows. They are useful frameworks, but they are larger than needed for extracting invoice facts from one document at a time.

Wrap the package behind an app-owned interface:

```ts
type InvoiceAiParser = {
  parseInvoiceDocument(input: {
    documentId: string;
    fileName: string;
    text: NormalizedDocumentText;
  }): Promise<ParsedInvoiceDocument>;
};
```

This keeps the application insulated from AI SDK API churn and makes a future provider/package switch smaller.

## Provider Compatibility

Use two provider paths:

- First-party provider packages for cloud LLMs, such as OpenAI, Anthropic, Google, Mistral, or others supported by the AI SDK.
- OpenAI-compatible provider configuration for local or proxy endpoints.

For the first implementation, provider configuration is developer-level, not user-facing. Do not build a settings UI yet. Keep the configuration in main-process code, environment variables, or another developer-controlled local config that is not exposed through renderer IPC.

Initial test target:

```ts
type AiProviderSettings = {
  providerKind: 'openai-compatible';
  providerLabel: 'LM Studio';
  baseUrl: 'http://localhost:1234/v1';
  modelId: 'gemma-4';
  apiKey: 'lm-studio';
};
```

Use the actual model ID reported by LM Studio if it differs from `gemma-4`.

Future user-facing provider configuration shape:

```ts
type AiProviderSettings = {
  providerKind: 'openai' | 'anthropic' | 'google' | 'mistral' | 'openai-compatible';
  modelId: string;
  baseUrl?: string;
  apiKeyReference?: string;
};
```

For local LLMs:

- Ollama can expose OpenAI-compatible endpoints at `http://localhost:11434/v1/`.
- LM Studio also supports OpenAI-compatible local endpoints.
- The app should allow a custom base URL for `openai-compatible`.
- Local endpoints may support fewer structured-output features than cloud models, so validation and retry behavior must stay app-owned.

API keys should not be exposed to the renderer. For the first slice, avoid cloud API keys unless needed for development. When user-facing provider settings are added later, store keys through a secure app setting or OS credential storage and resolve them only in the main process.

### LM Studio

Support LM Studio through its OpenAI-compatible local server, not through the LM Studio-specific TypeScript SDK for the first slice.

Recommended future LM Studio settings shape:

```ts
type AiProviderSettings = {
  providerKind: 'openai-compatible';
  providerLabel: 'LM Studio';
  baseUrl: 'http://localhost:1234/v1';
  modelId: string;
  apiKeyReference?: string;
};
```

Reasons:

- LM Studio can serve local models through OpenAI-compatible endpoints.
- LM Studio supports structured JSON output on `/v1/chat/completions` through OpenAI-style `response_format` with JSON Schema.
- Using the OpenAI-compatible path keeps the Deductions app provider-neutral.
- The same `InvoiceAiParser` adapter can support LM Studio, Ollama, and other local/proxy servers with only settings changes.

LM Studio-specific notes:

- The developer or user running the development build must start the LM Studio local server before processing documents.
- The default local base URL is usually `http://localhost:1234/v1`.
- Start development with Gemma 4 loaded in LM Studio.
- The app needs the actual loaded model ID from LM Studio.
- `apiKey` is usually a placeholder for local LM Studio access, but the app should still model it as a provider setting because other OpenAI-compatible endpoints may require one.
- LM Studio has its own TypeScript SDK with Zod-based structured responses, but using it would couple the app more tightly to LM Studio. Keep that option in reserve only if OpenAI-compatible support is not enough.

## Structured Output

Use schema-validated structured output for AI extraction.

Structured output support depends on both the serving runtime and the model. The AI SDK can request structured output and validate the result, but it cannot make every model semantically reliable.

Practical support levels:

1. Native structured output or function/tool calling in the model.
2. Runtime-enforced JSON schema or JSON mode, such as LM Studio's structured output engine or Ollama's `format` support.
3. Prompt-only JSON, where the model is merely asked to return JSON.

Prefer the first two levels for automated invoice extraction. Prompt-only JSON should be treated as a fallback and should produce more `needs_review` outcomes.

Recommended parsed shape:

```ts
type ParsedInvoiceDocument = {
  documentType: 'invoice' | 'receipt' | 'not_invoice' | 'unknown';
  invoices: ParsedInvoice[];
  warnings: string[];
};

type ParsedInvoice = {
  vendor: string | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  currency: 'EUR';
  items: Array<{
    description: string;
    amountCents: number;
    taxYear: number | null;
    categoryId: TaxCategoryId | null;
    deductionReason: string;
    note: string | null;
  }>;
};
```

One document can contain multiple invoices. The first implementation must support one stored document producing zero, one, or multiple invoice rows. Each parsed invoice can produce one or more invoice item rows. The common case is expected to be one invoice per document, with occasional documents containing two invoices.

Post-processing rules:

- Reject or flag dates that are not valid ISO calendar dates.
- Default item `taxYear` from `invoiceDate` when the model does not provide a reliable value.
- Default uncertain categories to `uncategorized`.
- Require positive `amountCents` for generated invoice items.
- Require `vendor`, `invoiceDate`, and at least one valid item before inserting invoice rows.
- Set every generated item to `reviewStatus: 'pending'`.
- Put uncertainty into `note` or a document-level warning, not into `accepted` or `rejected` status.

If the model finds no invoice, set the document to `needs_review` rather than inserting placeholder invoice rows. If the model finds invoice header data but no valid invoice items, also set the document to `needs_review` and do not create invoice-only rows until a manual repair workflow exists.

## Data Model Implications

The current schema already has the main target tables:

- `documents`
- `invoices`
- `invoice_items`

The current `documents.status` values also match this workflow:

- `imported`
- `processing`
- `needs_review`
- `processed`

Recommended additions when processing is implemented:

```ts
documents: {
  processingStartedAt: integer,
  processingCompletedAt: integer,
  processingError: text,
  processorVersion: text,
}
```

Consider a separate extraction cache only if reprocessing speed or debug visibility becomes important:

```ts
document_text_extractions: {
  documentId: text primary key references documents.id,
  extractor: text not null,
  extractorVersion: text not null,
  pageCount: integer not null,
  charCount: integer not null,
  pagesJson: text not null,
  createdAt: integer not null,
  updatedAt: integer not null,
}
```

Do not store raw prompts, model completions, or provider request bodies by default. They can contain sensitive invoice data and provider-specific noise. Store normalized invoice/item drafts and concise errors first.

## Background Processing And UI

Do not block the UI until the entire document has been processed.

Recommended behavior:

- Import returns after accepted files are stored.
- Documents appear immediately with status `Imported` or `Processing`.
- A main-process queue processes documents in the background.
- Documents view updates when a document status changes.
- Tax-year Review counts update after invoice items are created.
- Users can continue navigating while processing runs.
- Opening a processing document shows status and disables only actions that require completed extraction.

Recommended first queue:

- In-memory queue owned by the main process.
- Concurrency of 1 by default.
- Retry action from Documents.
- On app startup, recover documents stuck in `processing` by moving them back to `imported` or `needs_review` with a clear message.

Use persisted document status as the source of truth. The queue itself does not need to be durable in the first slice because unprocessed documents can be discovered by status on startup.

## Processing Triggers

Recommended first behavior:

- After manual import, enqueue accepted documents automatically if developer-level AI provider configuration is present.
- If no developer-level AI provider configuration is present, leave documents as `imported` and show a developer-facing error or log message. Do not build user-facing provider setup in this slice.
- Add a document-level `Retry processing` action for `needs_review` documents.
- Add a document-level `Process now` action for `imported` documents.

Scheduled sources should later feed the same queue. The trigger should differ, not the processing pipeline.

## Transaction Boundary

Write generated invoices and invoice items in one database transaction.

Recommended transaction sequence:

1. Re-read the document row and verify it is still eligible for the current processing attempt.
2. Delete or replace previous generated drafts only if this is an explicit retry policy.
3. Insert one invoice row for each valid parsed invoice.
4. Insert one or more invoice item rows for each inserted invoice.
5. Set document status to `processed`.

Avoid partial success where an invoice exists but some of its AI-generated items failed to insert. If validation fails, keep the document in `needs_review` and do not write partial generated records unless manual repair workflows have been designed.

## Error Handling

Document-level `needs_review` reasons:

- PDF cannot be opened.
- PDF is password protected.
- No embedded text was found.
- Extracted text is too short to parse reliably.
- AI provider is not configured.
- AI provider request failed.
- AI output failed schema validation.
- AI found no invoice or receipt.
- Required invoice fields are missing.
- Required item fields are missing.

Do not treat normal low-confidence invoice items as document-level failures. If a valid item can be generated, create it as `pending` and put uncertainty in item notes for tax-year review.

## Privacy And Security

Invoice PDFs and extracted text can contain personal data.

Recommended rules:

- Keep PDF parsing local.
- For the first slice, use local LM Studio by default so extracted text stays on the user's machine.
- Send extracted text to an external AI provider only in later slices after explicit user-facing provider configuration and consent exist.
- Keep API keys out of renderer IPC payloads.
- Do not log extracted text or model responses in normal logs.
- Make local LLM configuration a first-class path, not a hidden developer-only option.

## Implementation Order

Recommended implementation slices after review:

1. Add processing metadata fields to `documents`.
2. Add a PDF.js text extraction module in the main process.
3. Add unit tests for extraction normalization using fixture PDFs.
4. Add an AI parser interface and one AI SDK-backed implementation.
5. Add developer-level provider settings resolution in the main process, initially targeting LM Studio with Gemma 4.
6. Add a main-process processing queue.
7. Add IPC/events or refresh behavior for document status changes.
8. Generate invoices and invoice items inside a transaction.
9. Add Documents actions for process now and retry.
10. Add UI states for imported, processing, needs review, and processed.

Keep OCR, source scheduling, advanced prompt/version history, and provider settings UI as separate slices unless they become necessary for the first usable processing path.

## Finalized Decisions

- Defer cloud AI privacy confirmation because the first processing slice uses local LM Studio.
- Defer choosing a default non-local provider.
- Do not cache normalized PDF text in SQLite from the start. Recompute it on retry unless performance or debugging needs justify a cache later.
- Support one document containing multiple invoices in the first implementation. Each invoice can contain one or more invoice items.
- If invoice header data is found but no valid invoice items are found, set the document to `needs_review` and do not create invoice-only rows until manual repair exists.
- Do not add item confidence as a first-class field in the first implementation. Use `reviewStatus: 'pending'` plus `note` for uncertainty.
- Defer user-facing provider settings UI.

## References

- PDF.js `getDocument` API: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- PDF.js `getTextContent` API: https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFPageProxy.html
- AI SDK providers and models: https://ai-sdk.dev/docs/foundations/providers-and-models
- AI SDK structured data: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
- AI SDK OpenAI-compatible providers: https://ai-sdk.dev/providers/openai-compatible-providers
- Ollama OpenAI compatibility: https://docs.ollama.com/api/openai-compatibility
- LM Studio OpenAI compatibility: https://lmstudio.ai/docs/developer/openai-compat
- LM Studio structured output: https://lmstudio.ai/docs/developer/openai-compat/structured-output
- LM Studio TypeScript structured response: https://lmstudio.ai/docs/typescript/llm-prediction/structured-response
