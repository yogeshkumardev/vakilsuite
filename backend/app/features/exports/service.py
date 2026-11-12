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
