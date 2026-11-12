# Android development index

Source map reviewed: 2026-11-12. Paths are relative to this directory.
Read [AGENTS.md](AGENTS.md) before changing Expo/native APIs.
Android belongs to the root Git repository; see the [workspace map](../PROJECT_INDEX.md).

## Runtime and state

Configured entry is `expo-router/entry` in [package.json](package.json).
Routes live in `app/`; `App.tsx` and `index.ts` are not the configured navigation entry.

| Concern | Entry | Preserve |
| --- | --- | --- |
| Navigation/bootstrap | [app/_layout.tsx](app/_layout.tsx) | Session restoration and queue lifecycle |
| Auth/transport | [src/lib/api/client.ts](src/lib/api/client.ts), [secureTokens.ts](src/lib/storage/secureTokens.ts) | Memory access tokens; SecureStore session credentials |
| Identity/query state | [auth.store.ts](src/store/auth.store.ts), [queryClient.ts](src/lib/queryClient.ts) | Account/chamber scope and stale-work protection |
| Chamber bootstrap | [ChamberBootstrap.tsx](src/components/chambers/ChamberBootstrap.tsx) | Scope transitions and cache isolation |
| Scan/PDF library | [src/lib/scans/](src/lib/scans/) | Scoped SQLite metadata and private files |
| Foreground upload queue | [upload.ts](src/lib/scans/upload.ts), [ScanQueue.tsx](src/components/ScanQueue.tsx) | Stable scan ID, checkpoints, confirm-before-cleanup |
| File viewing | [DocumentViewer.tsx](src/components/DocumentViewer.tsx), [localFiles.ts](src/lib/documents/localFiles.ts) | Fresh authorized URLs and supported in-app viewing |
| Embedded editor/dictation | [src/lib/editor/](src/lib/editor/) | URL/message validation, recorder lifecycle and temporary-file cleanup |

## Routes and features

Rows describe inspected source, not physical-device or live backend acceptance.
Tests listed below are under `tests/`.

| Route family | Related code | Test entry |
| --- | --- | --- |
| Auth/account | `app/(auth)/`, `app/account/`, `src/lib/api/auth.ts` | `auth-client.test.cjs`, `google-auth.test.cjs` |
| Cases, matters, contacts, fees | `app/(tabs)/cases.tsx`, `app/cases/`, `app/matters/`, `app/clients.tsx` | API modules and backend invariants |
| Library, capture, review, PDF import, upload | `app/(tabs)/library.tsx`, case capture routes, scan modules | `scan-library.test.cjs`, `scan-upload.test.cjs`, `document-contract.test.cjs` |
| Summary preparation/review | Case `summary.tsx`, `summary-review.tsx`, `src/lib/api/summaries.ts` | Backend summary tests and device review behavior |
| Working-document editor | Case `working-document-editor.tsx`, `src/lib/api/workingDocuments.ts` | `editor-bridge.test.cjs`, backend session/revision tests |
| Draft preflight/generation | `src/components/DraftPreflight.tsx`, `DraftGeneration.tsx`, draft-generation API | Backend preflight/generation tests |
| Research/OKF export | Case `legal-research.tsx`, `okf-export.tsx`, matching API modules | Backend research/preview tests and navigation |
| Review inbox | `app/review-inbox.tsx` | Permission/scope and navigation behavior |
| Editor spike/dictation | `app/editor-spike.tsx`, editor bridge and dictation APIs | `dictation-upload.test.cjs`, `native-dictation.test.cjs`, `recording-permission.test.cjs` |

Use `src/lib/api/` for transport and generated types for active wire contracts.
Preserve scanner → page review → PDF → local save → queue → presign → R2 PUT → confirm.
The persisted queue is foreground-only, not an Android OS background upload service.
Upload alone must not invoke paid AI. Signed URLs are not durable document identifiers.

## Checks and device development

Read scripts/versions from [package.json](package.json), native configuration from
[app.json](app.json) and [eas.json](eas.json). Do not regenerate native projects incidentally.

Run from `android-app/`: `pnpm lint`, `pnpm typecheck`, `pnpm test` for code changes.
Native package/plugin/permission/config changes require a new development build and device checks.
USB development normally uses `adb reverse tcp:8000 tcp:8000`,
`adb reverse tcp:8081 tcp:8081`, and `pnpm start:usb` with the backend running.
Check the installed app configuration before assuming loopback connectivity.

For scan/upload changes, exercise offline retry, restart, lifecycle and account/chamber changes.
For editor/dictation changes, check permissions, cancellation, failures and bridge messages
on a phone. Report unit, build and device evidence separately.
API changes follow the [contract guide](../contracts/README.md).
