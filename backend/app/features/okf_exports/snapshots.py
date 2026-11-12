"""Persist exact preview bytes; every read rechecks current case/source authority."""
import uuid

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.exceptions import ConflictError, NotFoundError
from .models import OkfContextSnapshot
from .schemas import OkfContextResponse, PrepareOkfExportPreviewRequest, SaveOkfContextRequest
from .service import OkfExportPreviewService, _canonical_hash


class OkfContextService(OkfExportPreviewService):
    async def save(self, *, case_id, body: SaveOkfContextRequest, user):
        await self.preparation._require_editable_case(case_id, user)
        selection = PrepareOkfExportPreviewRequest.model_validate(
            body.model_dump(exclude={"expected_manifest_sha256"}))
        preview = await self.preview(case_id=case_id, body=selection, user=user)
        if preview.manifest_sha256 != body.expected_manifest_sha256:
            raise ConflictError("Context changed since preview; review the new preview")
        await self.db.execute(insert(OkfContextSnapshot).values(
            id=uuid.uuid4(), case_id=case_id, created_by=user.id,
            manifest_sha256=preview.manifest_sha256, payload=preview.payload,
            selection=selection.model_dump(mode="json"),
        ).on_conflict_do_nothing(index_elements=["case_id", "manifest_sha256"]))
        row = await self.db.scalar(select(OkfContextSnapshot).where(
            OkfContextSnapshot.case_id == case_id,
            OkfContextSnapshot.manifest_sha256 == preview.manifest_sha256))
        result = self.response(row)
        await self.db.commit()
        return result

    async def read(self, *, case_id, snapshot_id, user):
        await self.preparation._require_readable_case(case_id, user)
        row = await self.db.scalar(select(OkfContextSnapshot).where(
            OkfContextSnapshot.case_id == case_id, OkfContextSnapshot.id == snapshot_id))
        if row is None:
            raise NotFoundError("Context snapshot not found")
        if _canonical_hash(row.payload) != row.manifest_sha256:
            raise ConflictError("Stored context integrity check failed")
        # Re-run approval, revocation, case scope, annexure and template checks.
        preview = await self.preview(case_id=case_id,
            body=PrepareOkfExportPreviewRequest.model_validate(row.selection), user=user)
        if preview.manifest_sha256 != row.manifest_sha256:
            raise ConflictError("Context is stale; prepare and review a new context")
        return self.response(row)

    @staticmethod
    def response(row):
        return OkfContextResponse(id=row.id, current=True,
            export_format=row.payload["format"], manifest_sha256=row.manifest_sha256,
            payload=row.payload)
