import copy
import json
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from app.core.exceptions import ConflictError, ValidationError
from app.features.summaries.review_editing import (
    apply_edits,
    editable_payload,
    effective_hash,
    effective_payload,
    text_blocks,
)
from app.features.summaries.review_service import SummaryReviewService
from app.features.summaries.models import SummaryRunStatus
from app.features.summaries.schemas import (
    SaveSummaryEditorRequest,
    DecideSummaryReviewRequest,
)


def payload():
    return {
        "output_language": "en-IN",
        "sections": [
            {
                "name": "executive_summary",
                "findings": [
                    {
                        "text": "Original finding",
                        "finding_type": "stated_fact",
                        "citations": [
                            {
                                "source_document_id": "doc",
                                "source_revision_id": "rev",
                                "source_paths": ["page:1"],
                                "page_number": 1,
                            }
                        ],
                    }
                ],
            }
        ],
        "uncertainties": [],
    }


def state(value):
    return {
        "root": {
            "type": "root",
            "children": [
                {
                    "type": "summary-review-block",
                    "blockId": b["id"],
                    "children": [
                        {
                            "type": "paragraph",
                            "children": [
                                {
                                    "type": "text",
                                    "text": "Lawyer correction",
                                    "format": 1,
                                }
                            ],
                        }
                    ],
                }
                for b in text_blocks(value)
            ],
        }
    }


def test_edit_preserves_original_and_source_bindings():
    original = payload()
    before = copy.deepcopy(original)
    edited, digest = apply_edits(original, state(original))
    assert original == before
    assert edited["sections"][0]["findings"][0]["text"] == "Lawyer correction"
    assert (
        edited["sections"][0]["findings"][0]["citations"]
        == original["sections"][0]["findings"][0]["citations"]
    )
    assert len(digest) == 64
    assert (
        effective_payload(
            SimpleNamespace(result_payload=original, review_payload=edited)
        )
        == edited
    )
    assert (
        effective_hash(SimpleNamespace(result_hash="old", review_hash=digest)) == digest
    )


@pytest.mark.parametrize(
    "mutation", ["unknown", "duplicate", "removed", "empty", "script"]
)
def test_rejects_lost_or_forged_source_bindings(mutation):
    original = payload()
    editor = state(original)
    blocks = editor["root"]["children"]
    if mutation == "unknown":
        blocks[0]["blockId"] = '["sources", 0]'
    if mutation == "duplicate":
        blocks.append(copy.deepcopy(blocks[0]))
    if mutation == "removed":
        blocks.clear()
    if mutation == "empty":
        blocks[0]["children"] = []
    if mutation == "script":
        blocks[0]["children"] = [{"type": "script", "text": "x"}]
    with pytest.raises(ValidationError):
        apply_edits(original, editor)


def test_preserved_json_is_readable_without_changing_provider_output():
    original = {
        "schema_version": "case-summary-unverified-v1",
        "raw_text": json.dumps(payload()),
    }
    assert editable_payload(original) == payload()
    assert original["schema_version"] == "case-summary-unverified-v1"
    assert not text_blocks(
        editable_payload({**original, "raw_text": '{"sections": ['}) or {}
    )


async def setup_service(monkeypatch, status=SummaryRunStatus.pending_review):
    import app.features.summaries.review_service as module

    monkeypatch.setattr(module, "require_capability", AsyncMock())
    run = SimpleNamespace(
        id="run",
        status=status,
        result_hash="a" * 64,
        result_payload=payload(),
        review_version=1,
        review_payload=None,
        review_hash=None,
        review_editor_state=None,
    )
    db = SimpleNamespace(
        commit=AsyncMock(),
        refresh=AsyncMock(),
        scalar=AsyncMock(return_value=0),
        add=Mock(),
    )
    service = SummaryReviewService(db)
    service.preparation._require_readable_case = AsyncMock(
        return_value=SimpleNamespace(chamber_id="chamber")
    )
    service._get_run = AsyncMock(return_value=run)
    service._detail = AsyncMock(side_effect=lambda value: value)
    return service, run, SimpleNamespace(id="user")


@pytest.mark.asyncio
async def test_save_then_approve_exact_edited_version_and_lock(monkeypatch):
    from app.features.summaries.generation import SummaryGenerationService

    service, run, user = await setup_service(monkeypatch)
    original = copy.deepcopy(run.result_payload)
    await service.save_editor(
        case_id="case",
        run_id="run",
        user=user,
        body=SaveSummaryEditorRequest(
            expected_review_version=1,
            expected_result_hash=run.result_hash,
            editor_state=state(original),
        ),
    )
    assert run.result_payload == original
    assert run.review_version == 2
    collect = AsyncMock(
        return_value=(
            [
                {
                    "source_document_id": "doc",
                    "source_revision_id": "rev",
                    "source_paths": ["page:1"],
                    "page_paths": {"page:1": 1},
                    "source_blocks": {"page:1": "Lawyer correction"},
                }
            ],
            None,
        )
    )
    monkeypatch.setattr(SummaryGenerationService, "_authorize_and_collect", collect)
    await service.decide(
        case_id="case",
        run_id="run",
        user=user,
        body=DecideSummaryReviewRequest(
            action="approve",
            expected_review_version=2,
            expected_result_hash=run.review_hash,
        ),
    )
    assert run.status == SummaryRunStatus.completed
    assert service.db.add.call_args.args[0].result_hash == run.review_hash
    with pytest.raises(ConflictError, match="awaiting review"):
        await service.save_editor(
            case_id="case",
            run_id="run",
            user=user,
            body=SaveSummaryEditorRequest(
                expected_review_version=3,
                expected_result_hash=run.review_hash,
                editor_state=state(original),
            ),
        )


@pytest.mark.asyncio
async def test_stale_editor_cannot_overwrite_saved_edits(monkeypatch):
    service, run, user = await setup_service(monkeypatch)
    with pytest.raises(ConflictError, match="another session"):
        await service.save_editor(
            case_id="case",
            run_id="run",
            user=user,
            body=SaveSummaryEditorRequest(
                expected_review_version=2,
                expected_result_hash=run.result_hash,
                editor_state=state(payload()),
            ),
        )
    service.db.commit.assert_not_awaited()


@pytest.mark.parametrize(
    "root", [None, [], "bad", {"type": "root", "children": [None]}]
)
def test_malformed_editor_is_rejected_cleanly(root):
    with pytest.raises(ValidationError):
        apply_edits(payload(), {"root": root})


@pytest.mark.asyncio
async def test_draft_context_uses_approved_edits_not_provider_text(monkeypatch):
    import uuid
    from app.features.okf_exports.service import OkfExportPreviewService
    from app.features.okf_exports.schemas import PrepareOkfExportPreviewRequest
    from app.features.summaries.contracts import CaseSummaryPayload

    original = payload()
    revised, digest = apply_edits(original, state(original))
    run = SimpleNamespace(
        id=uuid.uuid4(),
        status=SummaryRunStatus.completed,
        result_payload=original,
        review_payload=revised,
        result_hash="a" * 64,
        review_hash=digest,
        source_manifest_hash="b" * 64,
    )
    case = SimpleNamespace(id=uuid.uuid4())
    db = SimpleNamespace(scalar=AsyncMock(return_value=run))
    catalog = Mock()
    catalog.require_template.return_value.model_dump.return_value = {}
    catalog.require_template.return_value.okf_spec_commit = "test"
    catalog.require_template.return_value.okf_spec_version = "0.2"
    catalog.capture_template.return_value = {}
    service = OkfExportPreviewService(db, catalog=catalog)
    service.preparation._require_readable_case = AsyncMock(return_value=case)
    service._reauthorize_sources = AsyncMock()
    service._source_dependencies = AsyncMock(return_value=[])
    service._annexures = AsyncMock(return_value=[])
    request = PrepareOkfExportPreviewRequest(
        summary_run_id=run.id,
        expected_summary_result_hash=digest,
        bundle_id="bundle",
        bundle_version="1.0",
        template_entry_id="template",
        confirmed_findings=[{"section": "executive_summary", "finding_index": 0}],
    )
    result = await service.preview(
        case_id=case.id, body=request, user=SimpleNamespace(id=uuid.uuid4())
    )
    assert (
        result.payload["application"]["confirmed_facts"][0]["text"]
        == "Lawyer correction"
    )
    assert result.payload["application"]["summary"]["result_hash"] == digest
    assert (
        CaseSummaryPayload.model_validate(original).sections[0].findings[0].text
        == "Original finding"
    )
    run.status = SummaryRunStatus.pending_review
    with pytest.raises(ConflictError, match="lawyer-approved"):
        await service.preview(case_id=case.id, body=request, user=SimpleNamespace())


def test_incomplete_json_recovers_text_without_inventing_missing_findings():
    from app.features.summaries.review_editing import recover_review_payload

    raw = json.dumps(payload())[:-1]
    recovered, notice = recover_review_payload(
        {"schema_version": "case-summary-unverified-v1", "raw_text": raw}
    )
    assert notice and "ended early" in notice
    assert recovered == payload()
    assert text_blocks(recovered)[0]["text"] == "Original finding"


@pytest.mark.asyncio
async def test_recovered_summary_requires_explicit_completion_review(monkeypatch):
    service, run, user = await setup_service(monkeypatch)
    run.result_payload = {
        "schema_version": "case-summary-unverified-v1",
        "raw_text": json.dumps(payload())[:-1],
    }
    await service.save_editor(
        case_id="case",
        run_id="run",
        user=user,
        body=SaveSummaryEditorRequest(
            expected_review_version=1,
            expected_result_hash=run.result_hash,
            editor_state=state(payload()),
        ),
    )
    with pytest.raises(ConflictError, match="every original"):
        await service.decide(
            case_id="case",
            run_id="run",
            user=user,
            body=DecideSummaryReviewRequest(
                action="approve",
                expected_review_version=2,
                expected_result_hash=run.review_hash,
            ),
        )
    assert run.status == SummaryRunStatus.pending_review
