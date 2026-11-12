import hashlib
import uuid
from copy import deepcopy
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.exceptions import ForbiddenError
from app.features.documents import source_service
from app.features.documents.page_provenance import pages_with_provenance
from app.features.documents.source_service import OriginalSourceService


TABLE = '<table><tr><td>A</td></tr><tr><td>B</td><td>C</td></tr></table>'


@pytest.fixture
def harness(monkeypatch):
    async def inline(fn, *args):
        return fn(*args)

    monkeypatch.setattr(source_service.asyncio, "to_thread", inline)
    doc = NS(id=uuid.uuid4(), case_id=uuid.uuid4(), chamber_id=uuid.uuid4())
    version = NS(id=uuid.uuid4(), sha256_hex=hashlib.sha256(b"pdf").hexdigest(),
                 detected_mime_type="application/pdf")
    user = NS(id=uuid.uuid4())
    source = NS(revision_id=None, mode="needs_review", editor_version=4,
                source_sha256=version.sha256_hex,
                pages=[{"page_number": 1, "text": "Human correction"}, {"page_number": 2, "text": TABLE}])
    source.editor_document = pages_with_provenance(source.pages)
    job = NS(payload={"response": {"provider": "sarvam", "document": {"pages": source.pages}}})
    db = NS(get=AsyncMock(return_value=source), scalar=AsyncMock(return_value=job), commit=AsyncMock())
    service = OriginalSourceService(db)
    service.authorized = AsyncMock(return_value=(doc, version))
    service.response = AsyncMock(return_value=source)
    can_edit = AsyncMock(return_value=True)
    monkeypatch.setattr(source_service, "CaseRepository", lambda _: NS(can_edit=can_edit))
    capability = AsyncMock()
    monkeypatch.setattr(source_service, "require_capability", capability)
    return NS(service=service, source=source, job=job, db=db, doc=doc, version=version,
              user=user, can_edit=can_edit, capability=capability)


@pytest.mark.asyncio
async def test_open_workspace_repairs_stored_tables_once_under_version_lock(harness, monkeypatch):
    h = harness
    monkeypatch.setattr(source_service, "read_original", lambda _: b"pdf")
    monkeypatch.setattr("app.features.documents.direct_pdf.digital_pdf", lambda _: (False, 2))
    monkeypatch.setattr("app.integrations.document_typing.sarvam.SarvamParseClient",
                        Mock(side_effect=AssertionError("No paid or result-fetch provider call")))
    before_first_page = deepcopy(h.source.editor_document["editorState"]["root"]["children"][0])
    await h.service.inspect(h.doc.id, h.user)
    assert all(call.kwargs == {"lock": True} for call in h.service.authorized.await_args_list)
    assert h.source.editor_version == 5
    assert h.source.editor_document["editorState"]["root"]["children"][0] == before_first_page
    assert h.source.editor_document["editorState"]["root"]["children"][1]["children"][0]["type"] == "table"
    assert "<table>" not in h.source.pages[1]["text"]
    assert h.job.payload["response"]["document"]["pages"][1]["text"] == TABLE
    await h.service.inspect(h.doc.id, h.user)
    assert h.source.editor_version == 5
    h.db.commit.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("reason", ["reviewed", "reader", "capability", "gemini", "edited"])
async def test_repair_preserves_reviewed_other_provider_and_manually_edited_content(harness, reason):
    h = harness
    if reason == "reviewed":
        h.source.revision_id = uuid.uuid4()
    elif reason == "reader":
        h.can_edit.return_value = False
    elif reason == "capability":
        h.capability.side_effect = ForbiddenError("No write capability")
    elif reason == "gemini":
        h.job.payload["response"]["provider"] = "gemini"
    elif reason == "edited":
        h.source.editor_document = pages_with_provenance([
            {"page_number": 1, "text": "Human correction"},
            {"page_number": 2, "text": TABLE.replace("A", "Edited")},
        ])
    before = deepcopy(h.source.editor_document)
    await h.service.repair_typing_layout(h.source, h.doc, h.version, h.user)
    assert h.source.editor_document == before
    assert h.source.editor_version == 4
    h.db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_stored_sarvam_comment_is_cleaned_without_tables_or_paid_retyping(harness):
    h = harness
    text = "Header\nThis image contains no discernible text.\nPrinted text"
    h.source.pages = [{"page_number": 1, "text": text}]
    h.source.editor_document = pages_with_provenance(h.source.pages)
    h.job.payload["response"]["document"]["pages"] = [{"page_number": 1, "text": text}]
    await h.service.repair_typing_layout(h.source, h.doc, h.version, h.user)
    assert h.source.pages[0]["text"] == "Header\nPrinted text"
    assert h.source.editor_version == 5
    assert h.job.payload["response"]["document"]["pages"][0]["text"] == text
