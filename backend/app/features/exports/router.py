from urllib.parse import quote

from fastapi import APIRouter, Response
from starlette.concurrency import run_in_threadpool

from app.core.api_responses import ERROR_RESPONSES
from app.core.dependencies import CurrentUser
from app.features.exports.schemas import RenderExportRequest
from app.features.exports.service import ExportService

router = APIRouter(prefix="/exports", tags=["Exports"])

FILE_RESPONSES = {
    200: {
        "description": "Generated DOCX or PDF file",
        "content": {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
                "schema": {"type": "string", "format": "binary"}
            },
            "application/pdf": {"schema": {"type": "string", "format": "binary"}},
        },
    },
    **ERROR_RESPONSES,
}


@router.post(
    "/render",
    response_class=Response,
    responses=FILE_RESPONSES,
    operation_id="exports_render",
    summary="Render versioned Lexical JSON as DOCX or PDF",
)
async def render_export(
    body: RenderExportRequest,
    _current_user: CurrentUser,
) -> Response:
    artifact = await run_in_threadpool(ExportService().render, body)
    ascii_name = artifact.file_name.encode("ascii", "ignore").decode().strip()
    if not ascii_name or ascii_name.startswith("."):
        extension = artifact.file_name.rsplit(".", 1)[-1]
        ascii_name = f"document.{extension}"
    disposition = (
        f'attachment; filename="{ascii_name}"; '
        f"filename*=UTF-8''{quote(artifact.file_name)}"
    )
    return Response(
        content=artifact.content,
        media_type=artifact.media_type,
        headers={
            "Content-Disposition": disposition,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )
