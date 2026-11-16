import base64
import binascii
import re
import unicodedata
from dataclasses import dataclass

from app.features.exports.libreoffice import LibreOfficeConverter
from app.features.exports.renderer import render_docx
from app.features.exports.schemas import RenderExportRequest


@dataclass(frozen=True)
class ExportArtifact:
    content: bytes
    media_type: str
    file_name: str


def _safe_file_stem(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).strip()
    normalized = re.sub(r"[\\/:*?\"<>|\x00-\x1f]", "-", normalized)
    normalized = re.sub(r"-+", "-", normalized)
    normalized = re.sub(r"\s+", " ", normalized).strip(" .-")
    return (normalized[:100].rstrip(" .-") or "vakilsuite-document")


class ExportService:
    def __init__(self, converter: LibreOfficeConverter | None = None) -> None:
        self.converter = converter or LibreOfficeConverter()

    def render(self, request: RenderExportRequest) -> ExportArtifact:
        # DOCX editor revisions retain the binary inside editorState so that a
        # Word round trip does not discard court formatting. Old JSON-only
        # documents continue through the deterministic renderer.
        encoded_docx = request.document.editor_state.get("docx_base64")
        if isinstance(encoded_docx, str) and encoded_docx:
            try:
                docx = base64.b64decode(encoded_docx, validate=True)
            except (ValueError, binascii.Error) as exc:
                raise ValueError("Saved DOCX content is invalid") from exc
            if len(docx) < 4 or not docx.startswith(b"PK\\x03\\x04"):
                raise ValueError("Saved DOCX content is invalid")
        else:
            docx = render_docx(request.document, request.title)
        stem = _safe_file_stem(request.file_name or request.title)
        if request.output_format == "docx":
            return ExportArtifact(
                content=docx,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                file_name=f"{stem}.docx",
            )
        return ExportArtifact(
            content=self.converter.convert(docx),
            media_type="application/pdf",
            file_name=f"{stem}.pdf",
        )
