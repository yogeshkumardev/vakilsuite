# Web development index

Source map reviewed: 2026-11-12. Paths are relative to this repository.
Read [AGENTS.md](AGENTS.md) for installed Next.js documentation rules.
See the [workspace map](../PROJECT_INDEX.md) for cross-client changes.

## Runtime and state

| Concern | Entry |
| --- | --- |
| Root providers, fonts, metadata | [src/app/layout.tsx](src/app/layout.tsx) |
| Authenticated shell | [Dashboard layout](<src/app/(dashboard)/layout.tsx>) |
| Fetch, refresh, errors, stale-account guards | [src/lib/api/client.ts](src/lib/api/client.ts) |
| Identity and chamber selection | [src/store/](src/store/) |
| Cache lifecycle | [QueryProvider](src/components/shared/QueryProvider.tsx) and feature hooks |
| Reusable UI | [src/components/ui/](src/components/ui/), [shared/](src/components/shared/) |
| Dormant route gates | [feature-availability.ts](src/lib/feature-availability.ts) |

Server state belongs in TanStack Query; identity/scope in stores; forms/view state stay local
unless URL persistence is needed. Preserve account/chamber isolation. Backend schemas are
wire-contract authority; read selected generated definitions and never edit them manually.

## Route and feature map

Parenthesized route groups do not appear in URLs. Rows describe inspected source.
Tests listed below are under `tests/`.

| Routes | Entry under `src/` | Test entry |
| --- | --- | --- |
| `/`, auth/recovery/verification | `components/marketing/`, `lib/api/auth.ts` | `auth-client.test.mjs`, `marketing-css.test.mjs` |
| `/dashboard`, `/profile`, `/chambers` | Dashboard routes, auth/chamber components, `lib/api/chambers.ts` | Auth tests and shell behavior |
| `/cases`, creation/detail/edit | `features/cases/`, `components/cases/`, `lib/api/cases.ts` | `case-actions.smoke.mjs` |
| `/clients`, `/matters/new`, matter clients/fees | Dashboard routes, `lib/api/clients.ts`, `lib/api/cases.ts` | Route behavior and backend invariants |
| Case document list/upload | `components/documents/`, `lib/api/upload-document.ts` | `upload-baseline.test.mjs`, `upload-workspace.smoke.mjs` |
| Case document detail/source review | `features/documents/sources/`, `lib/api/original-sources.ts` | `source-editor-content.test.mjs`, `source-errors.test.mjs`, `document-source.smoke.mjs` |
| Case summary coverage, fact cards and run review | `features/summaries/`, `lib/api/summaries.ts` | Document fact-card drawer with cited originals and safe resume of durable pending deliveries; `summary-errors.test.mjs`, `structured-summary.smoke.mjs`, `summary-editor.smoke.mjs` |
| Case working-document list/detail | `features/working-documents/`, `lib/api/working-documents.ts` | Backend revision tests and affected editor smoke tests |
| Case drafts, `/drafts/new/[runId]`, and `/drafts/bail-483` | `features/drafts/CaseDraftsWorkspace.tsx`, `features/drafts/Bail483DraftWorkspace.tsx`, `lib/api/court-drafts.ts` | `/drafts/new/[runId]` binds that approved summary to the Allahabad physical Section 483 BNSS blueprint; approved source filenames supply annexure numbering, cited findings supply affidavit prose, and generated content opens in the versioned Word workspace with DOCX/PDF export and stale guards |
| Case legal research and authority detail | `features/legal-research/`, `lib/api/legal-research.ts` | Backend research tests and UI behavior |
| Summary-run OKF export | `features/okf-exports/`, `lib/api/okf-exports.ts` | Backend preview/provenance tests |
| `/review-inbox` | Dashboard route and API consumers | Permission/scope behavior |
| `/editor-session/[sessionId]` | Editor session route, DOCX editor, working-document API | Backend bootstrap/revision tests |
| `/spike-editor` | Development editor route | Inspect current gates/callers before reuse |

Legacy context, courtroom, cause-list, notification and older draft-detail behavior is gated.
Draft list/new routes have explicit exceptions. An old directory/hook does not establish
an enabled route or a supported endpoint; inspect the feature gate and actual router.

## Editor boundaries and setup gap

- Current source, working-document and summary Word workspaces use
  [features/docx-editor/](src/features/docx-editor/). `DocxEditor.tsx` loads the client component;
  `content-conversion.ts` owns format conversion; `dictation/` owns editor dictation.
- [features/editor-core/](src/features/editor-core/) holds compatibility types and page-layout
  helpers for historical editor payloads. It does not load Lexical at runtime.
- [package.json](package.json) links `@casualoffice/docs` and `@eigenpal/docx-core` to
  `../docx-editor/packages/react` and `../docx-editor/packages/core`. These directories were
  absent and installed links broken at review. Restore the intended dependency source or
  explicitly resolve packaging before claiming install/build reproducibility.
- Dictation also uses `lib/api/dictation*.ts`, `lib/api/realtime-channel.ts` and the native
  bridge. Preserve bridge compatibility and recorder cleanup.

## Checks

Run from `frontend/`: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` as required.
Use focused checks first. `pnpm test:smoke` runs the baseline scenario; other smoke files
are separate and have their own server/fixture requirements. Review narrow/desktop layouts
and failure/retry behavior for UI changes. Missing local editor dependencies may block builds.

API changes follow the [contract guide](../contracts/README.md).
Read rewrite/settings from `next.config.ts` and source. Never expose server secrets through
browser-public variables. Report live service acceptance separately from mocked checks.
