"""Conservative native PDF reading; unknown/image-bearing pages require review."""

import hashlib
import io
import unicodedata

from pypdf import PdfReader
from app.core.exceptions import ValidationError

MAX_SOURCE_BYTES = 50 * 1024 * 1024
MAX_TEXT = 1_000_000
SUPPORTED_SOURCE_TYPES = {"application/pdf", "image/jpeg", "image/png", "image/webp"}


def usable_text(text: str) -> bool:
    chars = [c for c in text if not c.isspace()]
    if len(chars) < 20 or "(cid:" in text.lower():
        return False
    bad = sum(
        c == "\ufffd" or unicodedata.category(c) in {"Co", "Cs", "Cn", "Cc"}
        for c in chars
    )
    return bad == 0 and sum(c.isalnum() for c in chars) / len(chars) >= 0.45


def pdf_source_pages(payload: bytes, expected_hash: str) -> list[dict]:
    if (
        len(payload) > MAX_SOURCE_BYTES
        or hashlib.sha256(payload).hexdigest() != expected_hash
    ):
        raise ValidationError("Original size/hash verification failed")
    reader = PdfReader(io.BytesIO(payload), strict=True)
    if reader.is_encrypted or not 1 <= len(reader.pages) <= 500:
        raise ValidationError("PDF is encrypted or exceeds the page limit")
    pages = []
    total = 0
    for number, page in enumerate(reader.pages, 1):
        try:
            image_areas = []
            resources = page.get("/Resources", {})
            if hasattr(resources, "get_object"):
                resources = resources.get_object()
            xobjects = resources.get("/XObject", {})
            if hasattr(xobjects, "get_object"):
                xobjects = xobjects.get_object()

            def image_visitor(operator, operands, cm, tm):
                if operator == b"Do" and operands:
                    obj = xobjects.get(operands[0])
                    if obj is not None:
                        obj = obj.get_object()
                        if obj.get("/Subtype") == "/Image":
                            image_areas.append(
                                abs(
                                    float(cm[0]) * float(cm[3])
                                    - float(cm[1]) * float(cm[2])
                                )
                            )

            text = page.extract_text(visitor_operand_before=image_visitor) or ""
            image_count = len(page.images.keys())
            area = float(page.mediabox.width) * float(page.mediabox.height)
            # Small logos alone must not turn an otherwise readable digital page
            # into an OCR workflow. Unlocated/form-contained images fail closed.
            has_images = image_count > 0 and (
                len(image_areas) < image_count
                or area <= 0
                or sum(image_areas) / area >= 0.05
            )
            native = usable_text(text) and not has_images
            reason = (
                "readable_text"
                if native
                else "unreadable_text_mapping"
                if text and not usable_text(text)
                else "image_content_needs_review"
                if has_images
                else "no_readable_text"
            )
        except Exception:
            text, native, reason, image_count = "", False, "page_read_failed", 0
        total += len(text)
        if total > MAX_TEXT:
            raise ValidationError("PDF text exceeds the safe processing limit")
        pages.append(
            {
                "page_number": number,
                "text": text,
                "native": native,
                "reason": reason,
                "nontext_images": image_count > 0,
            }
        )
    return pages


def pages_editor(pages: list[dict]) -> dict:
    from app.features.documents.extraction_mapping import _paragraph

    return {
        "schemaVersion": 1,
        "pageLayout": {
            "pageSize": "A4",
            "orientation": "portrait",
            "marginTop": 20,
            "marginRight": 20,
            "marginBottom": 20,
            "marginLeft": 20,
        },
        "editorState": {
            "root": {
                "type": "root",
                "version": 1,
                "direction": None,
                "format": "",
                "indent": 0,
                "children": [
                    _paragraph(f"[Original page {p['page_number']}]\n{p['text']}")
                    for p in pages
                ],
            }
        },
    }
