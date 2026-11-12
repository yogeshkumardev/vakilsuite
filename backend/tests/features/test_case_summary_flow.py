"""Case-level readiness and persisted export security boundaries."""

from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
import pytest
from app.core.exceptions import ConflictError
from app.features.documents.models import UploadStatus
from app.features.summaries.coverage import validate_case_coverage
from app.features.documents.page_provenance import page_paths, pages_with_provenance


def document(ident, status=UploadStatus.uploaded):
    return NS(id=ident, upload_status=status)


def original(ident):
    return {"kind": "original_pdf", "document_id": ident}


def test_complete_mixed_case_requires_each_original_exactly_once():
    entries = [
        original("digital"),
        {"file_dependencies": [{"original_document_id": "scan"}]},
    ]
    validate_case_coverage([document("digital"), document("scan")], entries)
    for invalid in (
        entries[:1],
        entries + entries[:1],
        entries + [original("foreign")],
    ):
        with pytest.raises(ConflictError):
            validate_case_coverage([document("digital"), document("scan")], invalid)


@pytest.mark.parametrize(
    "status", [UploadStatus.pending, UploadStatus.failed, UploadStatus.quarantined]
)
def test_incomplete_upload_cannot_be_silently_omitted(status):
    with pytest.raises(ConflictError, match="pending/failed uploads"):
        validate_case_coverage(
            [document("digital"), document("new", status)], [original("digital")]
        )


def test_new_or_deleted_document_invalidates_existing_coverage():
    with pytest.raises(ConflictError):
        validate_case_coverage([document("new"), document("old")], [original("old")])
    with pytest.raises(ConflictError):
        validate_case_coverage(
            [document("old")], [original("old"), original("deleted")]
        )


def test_missing_scan_page_blocks_review_even_when_other_page_is_mapped():
    editor = pages_with_provenance(
        [
            {"page_number": 1, "text": "Reviewed first page"},
            {"page_number": 2, "text": ""},
        ]
    )
    with pytest.raises(Exception, match="Review every original page"):
        page_paths(editor, 2, require_complete=True)
    editor = pages_with_provenance(
        [
            {"page_number": 1, "text": "Reviewed first page"},
            {"page_number": 2, "text": "Blank page verified against original"},
        ]
    )
    assert set(page_paths(editor, 2, require_complete=True).values()) == {1, 2}


@pytest.mark.asyncio
async def test_missing_original_does_not_break_case_readiness(monkeypatch):
    """One stale object blocks itself while usable case documents remain visible."""
    import uuid

    from app.features.documents import source_service
    from app.features.summaries.service import SummaryPreparationService

    missing = NS(
        id=uuid.uuid4(),
        upload_status=UploadStatus.uploaded,
        mime_type="application/pdf",
        original_filename="missing.pdf",
    )
    available = NS(
        id=uuid.uuid4(),
        upload_status=UploadStatus.uploaded,
        mime_type="application/pdf",
        original_filename="available.pdf",
    )
    version_id = uuid.uuid4()

    class Sources:
        def __init__(self, _db):
            pass

        async def inspect(self, document_id, _user):
            if document_id == missing.id:
                raise ConflictError("Document file is missing from secure storage")
            return NS(
                mode="direct_pdf",
                file_version_id=version_id,
                source_sha256="a" * 64,
                working_document_id=None,
            )

    monkeypatch.setattr(source_service, "OriginalSourceService", Sources)
    db = NS(scalars=AsyncMock(return_value=[missing, available]), get=AsyncMock())
    service = SummaryPreparationService(db)
    service._require_readable_case = AsyncMock()
    service.working_documents.list_for_case = AsyncMock(return_value=[])

    candidates = await service.candidates(case_id=uuid.uuid4(), user=NS())

    blocked = next(item for item in candidates if item.original_document_id == missing.id)
    ready = next(item for item in candidates if item.original_document_id == available.id)
    assert not blocked.eligible
    assert blocked.reasons == ["source_unavailable"]
    assert ready.eligible
    assert ready.source_kind == "original_pdf"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "status", ["saved", "submitted", "changes_requested", "revoked"]
)
async def test_unapproved_draft_cannot_export(monkeypatch, status):
    from app.features.exports import review_gate as gate

    repo = NS(
        get=AsyncMock(return_value=NS(id="doc", case_id="case")),
        get_revision=AsyncMock(return_value=NS(content_sha256="hash", status=status)),
    )
    service = NS(repo=repo, _require_readable_case=AsyncMock())
    monkeypatch.setattr(gate, "WorkingDocumentService", lambda db: service)
    with pytest.raises(ConflictError, match="approve the saved draft"):
        await gate.require_reviewed_export(
            NS(),
            document_id="doc",
            revision_id="revision",
            expected_hash="hash",
            user=NS(),
        )


@pytest.mark.asyncio
async def test_approved_but_superseded_draft_cannot_export(monkeypatch):
    from app.features.exports import review_gate as gate
    from app.features.revisions.models import RevisionStatus

    revision = NS(id="revision", content_sha256="hash", status=RevisionStatus.approved)
    repo = NS(
        get=AsyncMock(return_value=NS(id="doc", case_id="case")),
        get_revision=AsyncMock(return_value=revision),
    )
    monkeypatch.setattr(
        gate,
        "WorkingDocumentService",
        lambda db: NS(repo=repo, _require_readable_case=AsyncMock()),
    )
    monkeypatch.setattr(
        gate,
        "SourceEligibilityResolver",
        lambda db: NS(resolve=AsyncMock(return_value=NS(eligible=False))),
    )
    with pytest.raises(ConflictError, match="latest revision"):
        await gate.require_reviewed_export(
            NS(),
            document_id="doc",
            revision_id="revision",
            expected_hash="hash",
            user=NS(),
        )


@pytest.mark.asyncio
async def test_legacy_empty_page_labels_are_not_presented_as_ocr_text():
    from app.features.documents.source_service import OriginalSourceService
    from app.features.documents.source_text import pages_editor
    from app.features.revisions.lexical import validate_editor_document

    pages = [
        {"page_number": 1, "text": "", "native": False, "reason": "scanned_document"}
    ]
    source = NS(
        revision_id=None,
        mode="needs_review",
        source_sha256="a" * 64,
        file_version_id=__import__("uuid").uuid4(),
        pages=pages,
        editor_document=pages_editor(pages),
        editor_version=2,
    )
    db = NS(scalars=AsyncMock(return_value=[]))
    response = await OriginalSourceService(db).response(source)
    assert (
        validate_editor_document(response.editor_document).normalized_text.strip() == ""
    )
    assert response.editor_version == 2
    assert source.editor_document == pages_editor(
        pages
    )  # Stored historical data is not rewritten.


@pytest.mark.asyncio
async def test_current_approved_manual_draft_passes_export_gate(monkeypatch):
    from app.features.exports import review_gate as gate
    from app.features.revisions.models import RevisionStatus

    revision = NS(id="revision", content_sha256="hash", status=RevisionStatus.approved)
    document = NS(id="doc", case_id="case", document_kind="manual")
    repo = NS(
        get=AsyncMock(return_value=document),
        get_revision=AsyncMock(return_value=revision),
    )
    monkeypatch.setattr(
        gate,
        "WorkingDocumentService",
        lambda db: NS(repo=repo, _require_readable_case=AsyncMock()),
    )
    monkeypatch.setattr(
        gate,
        "SourceEligibilityResolver",
        lambda db: NS(resolve=AsyncMock(return_value=NS(eligible=True))),
    )
    assert await gate.require_reviewed_export(
        NS(), document_id="doc", revision_id="revision", expected_hash="hash", user=NS()
    ) == (document, revision)
