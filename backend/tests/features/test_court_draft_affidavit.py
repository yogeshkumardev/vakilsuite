from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.exceptions import ValidationError
from app.features.drafts.affidavit import (
    bind_affidavit_paragraphs, cited_affidavit_findings, source_revision_hashes,
)
from app.features.drafts.annexures import summary_annexures


def test_affidavit_requires_complete_ordered_cited_findings() -> None:
    revision = str(uuid4())
    source = str(uuid4())
    summary = {"sections": [
        {"name": "executive_summary", "findings": [{"text": "Repeat", "citations": [{"source_revision_id": revision}]}]},
        {"name": "prosecution_allegations", "findings": [
            {"text": "FIR alleges an event.", "finding_type": "allegation", "citations": [{"source_document_id": source, "source_revision_id": revision, "page_number": 2}]},
            {"text": "A second assertion.", "finding_type": "stated_fact", "citations": [{"source_document_id": source, "source_revision_id": revision, "page_number": 3}]},
        ]},
    ]}
    findings = cited_affidavit_findings(summary)
    assert len(findings) == 2
    assert findings[0]["status"] == "allegation"
    with pytest.raises(ValueError, match="omitted"):
        bind_affidavit_paragraphs([{"finding_id": findings[0]["id"], "text": "The FIR alleges an event."}], findings)
    paragraphs = bind_affidavit_paragraphs(
        [{"finding_id": item["id"], "text": f"That {item['text']}"} for item in findings],
        findings, revision_hashes={revision: "a" * 64},
    )
    assert paragraphs[0]["text"].startswith("6. That")
    assert paragraphs[1]["text"].startswith("7. That")
    assert paragraphs[0]["citations"][0]["source_revision_hash"] == "a" * 64
    with pytest.raises(ValueError, match="does not belong"):
        bind_affidavit_paragraphs(
            [{"finding_id": item["id"], "text": item["text"]} for item in findings],
            findings, revision_hashes={},
        )


def test_revision_hashes_cover_reviewed_and_direct_pdf_sources() -> None:
    assert source_revision_hashes([
        {"revision_id": "reviewed", "revision_sha256": "a" * 64},
        {"kind": "original_pdf", "revision_id": "pdf", "sha256": "b" * 64},
    ]) == {"reviewed": "a" * 64, "pdf": "b" * 64}


@pytest.mark.asyncio
async def test_annexures_use_selected_original_versions_and_reject_duplicate_numbers() -> None:
    case_id, chamber_id = uuid4(), uuid4()
    first_id, second_id, first_version, second_version = (uuid4() for _ in range(4))
    documents = [
        NS(id=first_id, case_id=case_id, chamber_id=chamber_id, deleted_at=None),
        NS(id=second_id, case_id=case_id, chamber_id=chamber_id, deleted_at=None),
    ]
    versions = [
        NS(id=first_version, document_id=first_id, original_filename="Annexure-02_Order.pdf", sha256_hex="a" * 64),
        NS(id=second_version, document_id=second_id, original_filename="Annexure-01_FIR.pdf", sha256_hex="b" * 64),
    ]
    db = NS(scalars=AsyncMock(side_effect=[NS(all=lambda: documents), NS(all=lambda: versions)]))
    summary = NS(dependency_snapshot=[
        {"kind": "original_pdf", "document_id": str(first_id), "file_version_id": str(first_version)},
        {"kind": "original_pdf", "document_id": str(second_id), "file_version_id": str(second_version)},
    ])
    annexures = await summary_annexures(db, summary=summary, case_id=case_id, chamber_id=chamber_id)
    assert [item["annexure_number"] for item in annexures] == ["01", "02"]
    assert [item["description"] for item in annexures] == ["FIR", "Order"]
    versions[1].original_filename = "Annexure-02_FIR.pdf"
    db.scalars.side_effect = [NS(all=lambda: documents), NS(all=lambda: versions)]
    with pytest.raises(ValidationError, match="more than one"):
        await summary_annexures(db, summary=summary, case_id=case_id, chamber_id=chamber_id)
