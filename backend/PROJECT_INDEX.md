# Backend development index

Source map reviewed: 2026-11-12. Paths are relative to this repository.
See the [workspace map](../PROJECT_INDEX.md) for cross-client routing.

## Runtime ownership

| Concern | Start here | Inspect next |
| --- | --- | --- |
| Mounted API surface | [app/main.py](app/main.py) | Feature routers/schemas; registration is authority |
| Settings, identity, permissions | [app/core/](app/core/) | Config, dependencies, security, exceptions and envelopes |
| Database and migrations | [app/db/](app/db/) | Session, registry, historical migration chain |
| Rate limit and CSRF | [app/middleware/](app/middleware/) | Shared dependencies and auth tests |
| Worker transport | [app/worker/celery_app.py](app/worker/celery_app.py) | Delivery, tasks, job leases and domain state |
| External adapters | [app/integrations/](app/integrations/) | AI, speech, document typing and Indian Kanoon |

Typical flow: router → service → repository/model; schemas define the public boundary.
Inspect feature-specific transaction ownership before extending it.

## Feature map

Rows describe inspected source, not live acceptance. Tests below are under `tests/features/`.
Exact API operations and gates belong to mounted routers and schemas.

| Feature | Entry | Related logic / test entry |
| --- | --- | --- |
| Auth, verification, sessions | [auth/](app/features/auth/) | `users/`; `test_auth_sessions.py`, `test_auth_verification_flow.py` |
| Chambers and provider policy | [chambers/](app/features/chambers/) | Shared dependencies; `test_chamber_capabilities.py` |
| Cases, matters, access | [cases/](app/features/cases/) | Router/service/repository; client and summary callers |
| Client contacts and case links | [clients/](app/features/clients/) | Case links and chamber isolation |
| Fee ledger, receipts, custody | [fees/](app/features/fees/), [receipts/](app/features/receipts/) | Matter routes, schemas and ledger invariants |
| Uploads and file versions | [documents/router.py](app/features/documents/router.py) | Service, repository, verification; `test_upload_idempotency.py`, `test_document_verification.py` |
| Source text, OCR, typing, provenance | [documents/source_service.py](app/features/documents/source_service.py) | Source OCR/text, typing layout, extraction modules; `test_original_source_text.py`, `test_source_ocr_submission.py`, `test_source_page_review.py` |
| Working documents and revisions | [revisions/](app/features/revisions/) | Editor sessions/concurrency; `test_working_document_revisions.py`, `test_editor_bootstrap_sessions.py` |
| Summary map/reduce, preparation and review | [summaries/](app/features/summaries/) | Revision-bound document fact cards, durable per-run map-delivery outbox, synthesis worker and cited-source views; `test_summary_execution.py`, `test_summary_fact_cards.py`, `test_summary_review_editor.py` |
| Draft generation and human review | [workflows/](app/features/workflows/) | S528/resume workers; `test_s528_generation.py`, `test_workflow_poc.py` |
| DOCX/PDF exports | [exports/](app/features/exports/) | Renderer, LibreOffice, review gate, durable worker; `test_exports.py` |
| OKF previews and context | [okf_exports/](app/features/okf_exports/) | Knowledge bundles; `test_okf_export_preview.py`, `test_okf_context_snapshots.py` |
| Legal research and authorities | [legal_research/](app/features/legal_research/) | Indian Kanoon adapter/worker; `test_legal_research_workflow.py` |
| Multipart/realtime dictation | [dictation/](app/features/dictation/) | Speech adapters; `test_dictation.py`, `test_dictation_realtime.py` |
| Durable jobs | [jobs/](app/features/jobs/) | Worker delivery; `test_jobs_contract.py`, `test_worker_loop_lifecycle.py` |
| Offline anonymization | [draft_anonymization/](app/features/draft_anonymization/) | Explicit scripts/adapters; `test_draft_anonymization.py` |
| Court-format rule resolution | [court_rules/](app/features/court_rules/) | Source-cited YAML in `../courts/<court>/`; `test_court_rules.py` |
| Court draft blueprint selection | [blueprints/](app/features/blueprints/) | Declarative YAML in `../courts/<court>/blueprints/`; `test_blueprints.py` |
| Court draft assembly, advocate profile and compliance | [drafts/](app/features/drafts/) | Summary-hash guard, approved-source filename annexure mapping, Allahabad physical bail blueprint, cited affidavit finding coverage, policy-gated Gemini prose job, deterministic renderer/validator, and linked versioned Word-editor handoff with DOCX/PDF export; `test_court_drafts.py`, `test_court_draft_affidavit.py`, `test_court_draft_rendering.py` |
| Retrieval POC | [retrieval_poc/](app/features/retrieval_poc/) | `test_retrieval_poc.py`; POC presence does not certify production retrieval |

## Development and checks

Dependencies: [pyproject.toml](pyproject.toml). Infrastructure: [docker-compose.yml](docker-compose.yml).
The workspace [dev script](../scripts/dev.sh) starts migrations, worker/beat, API and web;
inspect it before use. When PostgreSQL/Redis are managed separately, use
`../scripts/dev-backend.sh` for the API plus Celery worker; it does not run Docker or migrations.

Run from `backend/` as appropriate:

```bash
uv run uvicorn app.main:app --reload
uv run ruff check app tests scripts
uv run pytest -q
uv run alembic heads
```

Use focused tests while implementing. Database checks need an intentionally configured
non-production database; inspect opt-in tests first. Check database revision with
`uv run alembic current` when connectivity is intended. Changed migrations require isolated
upgrade/downgrade checks. API changes follow the [contract guide](../contracts/README.md).

Never run reset, seed, repair, cleanup or provider scripts as ordinary verification.
Preserve historical migrations even when models are absent from the runtime registry.
Report provider, R2, mail, database and worker acceptance separately from unit tests.
