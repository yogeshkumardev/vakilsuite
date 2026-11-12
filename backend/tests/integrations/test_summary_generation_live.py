"""Opt-in paid Gemini smoke: fictional PDF + reviewed text through review output.

Run with RUN_SUMMARY_LIVE_TEST=1. Never reads application or client documents.
"""

import io
import os
import textwrap

import pytest
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject

from app.features.summaries.prompt import build_case_summary_contents
from app.features.summaries.structured import StructuredSummary
from app.features.summaries.structured_validation import validate_structured
from app.features.summaries.presentation import present_summary
from app.integrations.ai.contracts import ProviderError
from app.integrations.ai.gemini import GeminiAdapter


def synthetic_sources():
    pdf_pages = [
        "FICTIONAL TEST RECORD: FIR 12 of 2025, Model Police Station. "
        "Complainant Arun Example reports that on 1 January 2025 at 10:00 am, "
        "Bharat Sample allegedly struck his left arm during an argument outside "
        "the model market. Arun says the dispute concerned a borrowed bicycle. "
        "He names Chitra Demo as a person who was nearby. The complaint was "
        "recorded on 2 January 2025 at 9:00 am. The FIR records section 115(2) "
        "BNS as the alleged provision. This is the complainant's account, not "
        "a judicial finding. There is no applicant statement in this record.",
        "FICTIONAL TEST RECORD: Continuation of FIR 12 of 2025. "
        "The investigating officer requested a medical examination on 2 January "
        "2025. A medical report is not attached to this record. The complaint "
        "lists no seized weapon. No photograph, video, or independent witness "
        "statement is attached. Arun gives the location as the east entrance "
        "of the model market. No court case number or court order is recorded. "
        "The record contains no request for quashing, no bail order and no "
        "decision on the truth of the complaint.",
    ]
    reviewed = (
        "FICTIONAL REVIEWED REPORT: Investigation report dated 15 January 2025 "
        "in FIR 12 of 2025, Model Police Station, names Bharat Sample as accused "
        "and Arun Example as complainant. It repeats the allegation of an assault "
        "on 1 January 2025 but gives the time as 11:00 am, without explaining "
        "the difference from the complaint. It records that Chitra Demo was "
        "interviewed on 3 January 2025. Her actual statement is not supplied. "
        "The report says that a medical report was requested and is awaited. "
        "It mentions section 115(2) BNS. It supplies no account by Bharat, no "
        "court order, no case number assigned by a court and no finding of guilt."
    )
    writer = PdfWriter()
    for content in pdf_pages:
        page = writer.add_blank_page(width=600, height=800)
        font = DictionaryObject({NameObject("/Type"): NameObject("/Font"),
                                 NameObject("/Subtype"): NameObject("/Type1"),
                                 NameObject("/BaseFont"): NameObject("/Helvetica")})
        page[NameObject("/Resources")] = DictionaryObject({
            NameObject("/Font"): DictionaryObject({NameObject("/F1"): font})})
        lines = []
        for line in textwrap.wrap(content, 80):
            escaped = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            lines.append(f"({escaped}) Tj T*")
        stream = DecodedStreamObject()
        stream.set_data(("BT /F1 11 Tf 14 TL 40 750 Td " + " ".join(lines) + " ET").encode())
        page[NameObject("/Contents")] = writer._add_object(stream)
    out = io.BytesIO()
    writer.write(out)
    records = [
        dict(source_document_id="original-digital", original_document_id="original-digital",
             file_version_id="digital-version", source_revision_id="digital-version",
             page_paths={"page:1": 1, "page:2": 2}, source_paths=["page:1", "page:2"],
             source_blocks={}, text="Read the attached original PDF; cite its physical pages."),
        dict(source_document_id="reviewed-working", original_document_id="original-scanned",
             file_version_id="scanned-version", source_revision_id="reviewed-revision",
             page_paths={"reviewed:1": 1}, source_paths=["reviewed:1"],
             source_blocks={"reviewed:1": reviewed}, text="[reviewed:1]\n" + reviewed),
    ]
    return records, [dict(source_document_id="original-digital",
                          source_revision_id="digital-version", data=out.getvalue())]


@pytest.mark.skipif(os.getenv("RUN_SUMMARY_LIVE_TEST") != "1", reason="Paid provider smoke is opt-in")
def test_live_mixed_sources_produce_reviewable_summary():
    records, pdfs = synthetic_sources()
    result = GeminiAdapter().summarize_case(
        contents=build_case_summary_contents(source_records=records, language="en-IN"),
        pdf_sources=pdfs, structured=True, max_output_tokens=32768,
    )
    assert not isinstance(result, ProviderError), result
    payload, input_tokens, output_tokens, request_id = result
    assert isinstance(payload, StructuredSummary)
    assert payload.output_language == "en-IN"
    payload.canonicalize()
    report = validate_structured(payload, records)
    view = present_summary(payload)
    assert len(view.sections) == 15
    assert report["total_findings"] > 0
    assert {c.document_id for f in payload.facts() for c in f.citations} == {
        "original-digital", "original-scanned",
    }
    print({"sections": len(view.sections), "findings": report["total_findings"],
           "input_tokens": input_tokens, "output_tokens": output_tokens,
           "request_id": request_id})
