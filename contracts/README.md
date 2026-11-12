# API v1 contract

Runtime authority: backend routers + Pydantic response models. The generated
OpenAPI snapshot and TypeScript definitions are versioned here, with identical
type copies in each client so each app can build without a monorepo dependency.
The synthetic auth/upload fixture is also copied into each repository's tests.
No real credentials, signed URLs or client documents belong here.

From workspace root, after backend and frontend dependencies are installed:

```bash
node scripts/sync-api-contract.mjs
node scripts/sync-api-contract.mjs --check
```

The exporter imports the runtime app but does not connect to PostgreSQL/R2 or
run migrations. Generation uses the pinned openapi-typescript dependency from
frontend. Review the schema diff and commit generated copies in **all three
repositories** alongside the backend change. `--check` fails on drift without writes.

The standard metadata-upload confirmation is `{success: true, data: {document: ...}}` and its
request body is `{}`. No `processing_run`, OCR status, page count or typed revision
is supplied. Browser auth omits refresh_token; native auth returns it. Errors use
`{success: false, error: {code, message, details}}`. `/health` returns a plain
health object; binary export/download operations also bypass JSON success envelopes.

Generated types are compile-time contracts, not runtime validation or access
control. Editor formats are surface-specific: current DOCX workspaces and retained Lexical code
coexist. Inspect their callers and revision schemas; handwritten editor types do not
replace generated wire contracts. See the [web map](../frontend/PROJECT_INDEX.md).

For navigation, use the [workspace map](../PROJECT_INDEX.md). Keep exact endpoint and
schema inventories in generated artifacts; extract only the relevant operation for review.
