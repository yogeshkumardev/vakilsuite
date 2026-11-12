"""Original PDF routing: text objects, not extracted Unicode quality, define digital."""

import io
from pypdf import PdfReader
from pypdf.generic import ContentStream
from app.core.exceptions import ValidationError


def _has_text(stream, resources, reader, depth=0):
    if depth > 16:
        raise ValidationError("PDF form nesting exceeds the inspection limit")
    resources = (
        resources.get_object() if hasattr(resources, "get_object") else resources
    )
    objects = resources.get("/XObject", {})
    objects = objects.get_object() if hasattr(objects, "get_object") else objects
    for args, op in ContentStream(stream, reader).operations:
        if op in (b"Tj", b"TJ", b"'", b'"') and args:
            return True
        if op == b"Do" and args and args[0] in objects:
            child = objects[args[0]].get_object()
            if child.get("/Subtype") == "/Form" and _has_text(
                child, child.get("/Resources", resources), reader, depth + 1
            ):
                return True
    return False


def digital_pdf(data: bytes) -> tuple[bool, int]:
    # Inspect text drawing operators only. Broken Unicode font mappings must
    # never force a digital original through an extraction/review workflow.
    try:
        reader = PdfReader(io.BytesIO(data), strict=True)
        if reader.is_encrypted or not 1 <= len(reader.pages) <= 500:
            raise ValidationError("Unsupported PDF")
        any_text = False
        for page in reader.pages:
            stream = page.get_contents()
            if stream is None or not stream.operations:
                continue
            text = _has_text(stream, page.get("/Resources", {}), reader)
            if not text:
                return False, len(reader.pages)
            any_text |= text
        return any_text, len(reader.pages)
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError(
            "PDF cannot be inspected; upload a valid unencrypted PDF"
        ) from exc


async def collect_pdf(db, *, case_id, user, selection):
    from app.features.documents.source_service import OriginalSourceService
    from app.core.exceptions import ConflictError

    doc, version = await OriginalSourceService(db).authorized(
        selection["document_id"], user
    )
    if (
        doc.case_id != case_id
        or str(version.id) != str(selection["file_version_id"])
        or version.sha256_hex != selection["sha256"]
        or version.detected_mime_type != "application/pdf"
    ):
        raise ConflictError("Selected original PDF changed or is unavailable")
    inspected = await OriginalSourceService(db).inspect(doc.id, user)
    if inspected.mode != "direct_pdf" or str(inspected.file_version_id) != str(
        version.id
    ):
        raise ConflictError("This original is scanned/mixed and requires reviewed text")
    return doc, version
