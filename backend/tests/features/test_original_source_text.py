import hashlib
import io
import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
import pytest
from botocore.exceptions import ClientError
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject
from app.features.documents.source_text import (
    pdf_source_pages,
    usable_text,
    pages_editor,
)
from app.features.revisions.lexical import validate_editor_document
from app.features.documents import source_eligibility as se
from app.features.documents.models import UploadStatus
from app.features.revisions.models import RevisionStatus


def pdf_bytes(texts):
    writer = PdfWriter()
    for text in texts:
        page = writer.add_blank_page(width=600, height=800)
        if text:
            font = DictionaryObject(
                {
                    NameObject("/Type"): NameObject("/Font"),
                    NameObject("/Subtype"): NameObject("/Type1"),
                    NameObject("/BaseFont"): NameObject("/Helvetica"),
                }
            )
            page[NameObject("/Resources")] = DictionaryObject(
                {NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})}
            )
            stream = DecodedStreamObject()
            stream.set_data(f"BT /F1 12 Tf 50 700 Td ({text}) Tj ET".encode())
            page[NameObject("/Contents")] = writer._add_object(stream)
    result = io.BytesIO()
    writer.write(result)
    return result.getvalue()


def test_digital_and_mixed_pages_and_original_hash():
    raw = pdf_bytes(["An allegation was recorded in the original document.", ""])
    pages = pdf_source_pages(raw, hashlib.sha256(raw).hexdigest())
    assert [p["native"] for p in pages] == [True, False]
    assert [p["page_number"] for p in pages] == [1, 2]
    validated = validate_editor_document(pages_editor(pages))
    assert validated.source_map[0]["path"] == "editorState.root.children.0.children.0"
    with pytest.raises(Exception, match="hash"):
        pdf_source_pages(raw, "f" * 64)


@pytest.mark.parametrize(
    "text", ["short", "\ufffd" * 40, "(cid:123)" * 20, "\ue001" * 40]
)
def test_garbled_text_does_not_bypass_review(text):
    assert not usable_text(text)


def test_hindi_unicode_is_readable():
    assert usable_text("यह दस्तावेज मूल अभिलेख की पठनीय डिजिटल प्रति है।")


def test_missing_storage_object_is_an_actionable_source_conflict(monkeypatch):
    from app.core.exceptions import ConflictError
    from app.features.documents import source_service

    client = NS(
        get_object=lambda **_: (_ for _ in ()).throw(
            ClientError({"Error": {"Code": "NoSuchKey"}}, "GetObject")
        )
    )
    monkeypatch.setattr(source_service, "get_r2_client", lambda: client)

    with pytest.raises(ConflictError, match="missing from secure storage"):
        source_service.read_original(
            NS(r2_bucket="bucket", r2_key="object", sha256_hex="a" * 64)
        )


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "mode,reviewer,ready",
    [
        ("native", None, False),
        ("needs_review", None, False),
        ("reviewed", uuid.uuid4(), True),
        ("reviewed", None, False),
    ],
)
async def test_original_binding_is_not_faked_by_saved_status(mode, reviewer, ready):
    ident = uuid.uuid4()
    doc = NS(id=uuid.uuid4(), case_id=uuid.uuid4(), chamber_id=uuid.uuid4())
    rev = NS(id=uuid.uuid4(), content_sha256="a" * 64, status=RevisionStatus.saved)
    row = NS(
        file_version_id=ident,
        source_sha256="b" * 64,
        revision_id=rev.id,
        revision_sha256=rev.content_sha256,
        mode=mode,
        reviewed_by=reviewer,
        pages=[{"native": mode == "native"}],
    )
    version = NS(
        id=ident,
        document_id=uuid.uuid4(),
        sha256_hex=row.source_sha256,
        chamber_id=doc.chamber_id,
        upload_status=UploadStatus.uploaded,
    )
    original = NS(
        id=version.document_id,
        case_id=doc.case_id,
        chamber_id=doc.chamber_id,
        deleted_at=None,
        upload_status=UploadStatus.uploaded,
    )
    db = NS(
        scalar=AsyncMock(side_effect=[row, ident]),
        get=AsyncMock(side_effect=[None, version, original]),
    )
    assert await se.original_source_eligibility(db, doc, rev) == (True, ready)
    original.deleted_at = "deleted"
    db.scalar = AsyncMock(return_value=row)
    db.get = AsyncMock(side_effect=[None, version, original])
    assert await se.original_source_eligibility(db, doc, rev) == (False, False)


@pytest.mark.asyncio
async def test_native_eligibility_opt_in_does_not_change_global_approval(monkeypatch):
    from tests.features.test_source_eligibility import resolver_harness

    resolver, user, document, revision, _ = resolver_harness(
        monkeypatch, revision_status=RevisionStatus.saved
    )
    document.document_kind = "original_source"
    monkeypatch.setattr(
        se, "original_source_eligibility", AsyncMock(return_value=(True, True))
    )
    kwargs = dict(
        user=user,
        working_document_id=document.id,
        revision_id=revision.id,
        expected_revision_sha256=revision.content_sha256,
    )
    assert not (await resolver.resolve(**kwargs)).eligible
    assert (await resolver.resolve(**kwargs, allow_original_text=True)).eligible


@pytest.mark.parametrize("image_size,expected", [(20, True), (500, False)])
def test_small_logo_does_not_force_ocr_but_large_image_does(image_size, expected):
    from pypdf import PdfReader
    from pypdf.generic import NumberObject

    reader = PdfReader(
        io.BytesIO(
            pdf_bytes(["This is readable native document text and source evidence."])
        )
    )
    writer = PdfWriter()
    page = writer.add_page(reader.pages[0])
    image = DecodedStreamObject()
    image.set_data(b"\x00\x00\x00")
    image.update(
        {
            NameObject("/Type"): NameObject("/XObject"),
            NameObject("/Subtype"): NameObject("/Image"),
            NameObject("/Width"): NumberObject(1),
            NameObject("/Height"): NumberObject(1),
            NameObject("/BitsPerComponent"): NumberObject(8),
            NameObject("/ColorSpace"): NameObject("/DeviceRGB"),
        }
    )
    page["/Resources"][NameObject("/XObject")] = DictionaryObject(
        {NameObject("/Im1"): writer._add_object(image)}
    )
    stream = DecodedStreamObject()
    stream.set_data(
        page.get_contents().get_data()
        + f"\nq {image_size} 0 0 {image_size} 0 0 cm /Im1 Do Q".encode()
    )
    page[NameObject("/Contents")] = writer._add_object(stream)
    data = io.BytesIO()
    writer.write(data)
    raw = data.getvalue()
    assert (
        pdf_source_pages(raw, hashlib.sha256(raw).hexdigest())[0]["native"] == expected
    )


def test_summary_citations_must_match_original_page_map():
    from tests.features.test_summary_validation import source_bound_payload
    from app.features.summaries.generation import SummaryGenerationService
    from app.features.summaries.prompt import build_case_summary_contents

    payload = source_bound_payload()
    path = "editorState.root.children.0"
    records = [
        {
            "source_document_id": "doc-a",
            "source_revision_id": "rev-a",
            "source_paths": [path],
            "source_blocks": {path: "The supplied record states this item."},
            "text": "The supplied record states this item.",
            "page_paths": {path: 3},
        }
    ]
    for section in payload.sections:
        for finding in section.findings:
            finding.citations[0].page_number = 3
    SummaryGenerationService._validate_payload(payload, records)
    assert '"editorState.root.children.0": 3' in build_case_summary_contents(
        source_records=records, language="en"
    )
    payload.sections[0].findings[0].citations[0].page_number = 4
    with pytest.raises(ValueError, match="page"):
        SummaryGenerationService._validate_payload(payload, records)
