# Workspace development instructions

Work as an experienced, humble full-stack engineer. Hinglish communication is welcome.

## Find the smallest useful context

- Start with [PROJECT_INDEX.md](PROJECT_INDEX.md), then only the affected app map.
- Backend and frontend have separate Git repositories; inspect their status/diff directly.
  Android, shared contracts and scripts belong to the root repository. Preserve unrelated work.
- Search explicit source paths with `rg`; root searches omit ignored backend/frontend trees.
- Read applicable app instructions and relevant skills. For Next.js APIs, consult installed
  local docs; for Expo/native APIs follow Android's versioned-documentation rules.
- Inspect the actual caller, router/schema and adjacent tests before editing. Missing sprint
  documents do not establish scope; the user's current authorization does.
- Read bounded source sections. Avoid whole generated contracts, duplicate type copies,
  lockfiles, build output, caches, environment files and secrets during ordinary discovery.

## Preserve product boundaries

- Enforce permissions server-side; preserve account/chamber isolation and stale-request guards.
- Upload/save alone must not silently invoke paid providers. Preserve explicit submission,
  provenance, review, idempotency and revision concurrency rules.
- Preserve the current surface's editor and saved format. DOCX and retained Lexical code
  coexist; package presence alone does not establish the active editor.
- Do not reset databases, rewrite applied migrations or enable dormant features incidentally.
- Never hand-edit generated API types; use the contract script for API changes.

## Reconcile older skill guidance

The `.codex/skills/` files are read-only in this workspace and contain older baseline
assumptions. Apply these repository-specific corrections when following those skills:

- Read the affected app index after the short root map, rather than loading every app.
- `SPRINT_DEVELOPMENT_PLAN.md` and old setup/POC docs are absent. Confirm current user scope;
  do not block ordinary authorized work on those missing references.
- Web editor ownership is surface-specific: current DOCX integration lives in
  `frontend/src/features/docx-editor/`; retained Lexical code is in `editor-core/` and
  summary surfaces. The old `features/drafts/components/editor/` path no longer exists.
- Source OCR/typing, summaries, research, revision and draft workflows now exist.
  Inspect current registration and provider policy rather than applying old baseline exclusions.
- Chamber membership/scoping is implemented, not merely a future architecture proposal.

## Finish the change

Run checks appropriate to affected behavior; see the app map and applicable skill.
Update navigation docs with route/ownership changes and run `node scripts/check-project-index.mjs`.
Distinguish source inspection and automated checks from live service/device acceptance.
