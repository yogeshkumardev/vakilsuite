"""Bounded server-side inspection of private uploaded originals."""

from __future__ import annotations

import hashlib
import io
import zipfile
from dataclasses import dataclass

from pypdf import PdfReader
from pypdf.errors import PdfReadError

from app.core.exceptions import ValidationError
from app.features.documents.models import DocumentContentClassification

MAX_PDF_PAGES = 500


class QuarantinedUploadError(ValidationError):
    """The object was received but cannot enter the verified-original set."""


@dataclass(frozen=True)
class VerifiedFile:
    detected_mime_type: str
    sha256_hex: str
    page_count: int | None
    content_classification: DocumentContentClassification
    page_classification_hints: list[dict[str, object]] | None


def verify_uploaded_bytes(*, declared_mime_type: str, payload: bytes) -> VerifiedFile:
    """Verify bytes after a storage size bound has already been enforced."""

    detected = _detect_mime_type(payload)
    if detected != declared_mime_type:
        raise QuarantinedUploadError(
            "Uploaded file content does not match the selected file type. Re-upload the original file."
        )

    page_count: int | None = None
    classification = DocumentContentClassification.not_applicable
    page_hints: list[dict[str, object]] | None = None
    if detected == "application/pdf":
        try:
            reader = PdfReader(io.BytesIO(payload), strict=True)
            if reader.is_encrypted:
                raise QuarantinedUploadError(
                    "Encrypted PDFs are not supported. Upload an unlocked copy."
                )
            page_count = len(reader.pages)
            classification, page_hints = classify_pdf_pages(reader)
        except QuarantinedUploadError:
            raise
        except (PdfReadError, ValueError, OSError, EOFError) as exc:
            raise QuarantinedUploadError(
                "This PDF is corrupt or unsupported. Export it again and re-upload."
            ) from exc
        if page_count < 1:
            raise QuarantinedUploadError(
                "This PDF has no pages. Upload a document with at least one page."
            )
        if page_count > MAX_PDF_PAGES:
            raise QuarantinedUploadError(
                f"This PDF has {page_count} pages; the current upload limit is {MAX_PDF_PAGES}."
            )
    elif detected == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        if not _is_docx(payload):
            raise QuarantinedUploadError(
                "This file is not a valid DOCX document. Re-export and re-upload it."
            )

    return VerifiedFile(
        detected_mime_type=detected,
        sha256_hex=hashlib.sha256(payload).hexdigest(),
        page_count=page_count,
        content_classification=classification,
        page_classification_hints=page_hints,
    )


def classify_pdf_pages(reader: PdfReader) -> tuple[DocumentContentClassification, list[dict[str, object]]]:
    """Return conservative text-layer hints without retaining page text.

    A page with selectable text can still contain scanned material, and a
    page without it can still be meaningful. Consumers must present this as a
    technical hint and keep the original/human review authoritative.
    """

    hints: list[dict[str, object]] = []
    has_text_layer = 0
    has_no_text_layer = 0
    unknown = False
    for page_number, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except (PdfReadError, ValueError, OSError):
            unknown = True
            hints.append({"page_number": page_number, "text_layer": "unknown"})
            continue
        # A few formatting glyphs should not label an image scan as digital.
        from app.features.documents.source_text import usable_text
        if usable_text(text):
            has_text_layer += 1
            hints.append({"page_number": page_number, "text_layer": "present"})
        else:
            has_no_text_layer += 1
            hints.append({"page_number": page_number, "text_layer": "absent"})

    if unknown:
        return DocumentContentClassification.unknown, hints
    if has_text_layer and has_no_text_layer:
        return DocumentContentClassification.mixed, hints
    if has_text_layer:
        return DocumentContentClassification.digital, hints
    if has_no_text_layer:
        return DocumentContentClassification.scanned, hints
    return DocumentContentClassification.unknown, hints


def _detect_mime_type(payload: bytes) -> str:
    if payload.startswith(b"%PDF-"):
        return "application/pdf"
    if payload.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if payload.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if payload.startswith((b"II*\x00", b"MM\x00*")):
        return "image/tiff"
    if len(payload) >= 12 and payload[:4] == b"RIFF" and payload[8:12] == b"WEBP":
        return "image/webp"
    if payload.startswith(b"PK\x03\x04"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    raise QuarantinedUploadError(
        "Unsupported or corrupt file signature. Upload PDF, DOCX, JPG, PNG, TIFF, or WebP."
    )


def _is_docx(payload: bytes) -> bool:
    try:
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            names = set(archive.namelist())
            return "[Content_Types].xml" in names and "word/document.xml" in names
    except zipfile.BadZipFile:
        return False
