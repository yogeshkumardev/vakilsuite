import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from typing import Callable

from app.features.exports.errors import ExportUnavailableError


class LibreOfficeConverter:
    """Convert a generated DOCX to PDF without a shell or shared LO profile."""

    def __init__(
        self,
        *,
        binary: str | None = None,
        timeout_seconds: int = 45,
        runner: Callable[..., subprocess.CompletedProcess] = subprocess.run,
    ) -> None:
        self.binary = binary
        self.timeout_seconds = timeout_seconds
        self.runner = runner

    def _resolve_binary(self) -> str:
        binary = self.binary or shutil.which("libreoffice") or shutil.which("soffice")
        if not binary:
            raise ExportUnavailableError(
                "PDF export requires LibreOffice Writer on the backend server"
            )
        return binary

    def convert(self, docx_bytes: bytes) -> bytes:
        binary = self._resolve_binary()
        with tempfile.TemporaryDirectory(prefix="vakilsuite-export-") as temp_dir:
            workdir = Path(temp_dir)
            source = workdir / "document.docx"
            target = workdir / "document.pdf"
            profile = workdir / "lo-profile"
            source.write_bytes(docx_bytes)

            command = [
                binary,
                "--headless",
                "--nologo",
                "--nodefault",
                "--nofirststartwizard",
                f"-env:UserInstallation={profile.as_uri()}",
                "--convert-to",
                "pdf:writer_pdf_Export",
                "--outdir",
                str(workdir),
                str(source),
            ]
            try:
                result = self.runner(
                    command,
                    check=False,
                    capture_output=True,
                    timeout=self.timeout_seconds,
                    env={**os.environ, "HOME": str(workdir)},
                )
            except subprocess.TimeoutExpired as exc:
                raise ExportUnavailableError("PDF conversion timed out") from exc
            except OSError as exc:
                raise ExportUnavailableError() from exc

            if result.returncode != 0 or not target.is_file():
                raise ExportUnavailableError("LibreOffice could not convert this document")
            pdf = target.read_bytes()
            if len(pdf) < 5 or not pdf.startswith(b"%PDF-"):
                raise ExportUnavailableError("LibreOffice returned an invalid PDF")
            return pdf
