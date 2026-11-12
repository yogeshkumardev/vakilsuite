import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ConflictError, NotFoundError
from app.features.okf_exports.schemas import PrepareOkfExportPreviewRequest, SaveOkfContextRequest
from app.features.okf_exports.service import _canonical_hash
from app.features.okf_exports.snapshots import OkfContextService


def setup_service():
    selection = dict(summary_run_id=str(uuid.uuid4()), expected_summary_result_hash="a"*64,
                     bundle_id="s528_curated_01", bundle_version="1.0.0",
                     template_entry_id="quashing-template",
                     confirmed_findings=[dict(section="case_identification", finding_index=0)])
    payload = {"format": "test", "facts": []}
    row = SimpleNamespace(id=uuid.uuid4(), payload=payload, selection=selection,
                          manifest_sha256=_canonical_hash(payload))
    db = SimpleNamespace(scalar=AsyncMock(return_value=row), execute=AsyncMock(), commit=AsyncMock())
    service = OkfContextService(db)
    service.preparation = SimpleNamespace(_require_readable_case=AsyncMock(),
                                         _require_editable_case=AsyncMock())
    service.preview = AsyncMock(return_value=SimpleNamespace(payload=payload,
                                    manifest_sha256=row.manifest_sha256))
    return service, row


@pytest.mark.asyncio
async def test_read_rechecks_authority_and_hash():
    service, row = setup_service()
    result = await service.read(case_id=uuid.uuid4(), snapshot_id=row.id, user=object())
    assert result.id == row.id and result.current
    service.preparation._require_readable_case.assert_awaited_once()
    service.preview.assert_awaited_once()
    service.preview.return_value.manifest_sha256 = "b"*64
    with pytest.raises(ConflictError):
        await service.read(case_id=uuid.uuid4(), snapshot_id=row.id, user=object())


@pytest.mark.asyncio
async def test_missing_corrupt_and_revoked_not_returned():
    service, row = setup_service()
    row.payload["facts"] = ["tampered"]
    with pytest.raises(ConflictError):
        await service.read(case_id=uuid.uuid4(), snapshot_id=row.id, user=object())
    service.preview.assert_not_awaited()
    service.db.scalar.return_value = None
    with pytest.raises(NotFoundError):
        await service.read(case_id=uuid.uuid4(), snapshot_id=row.id, user=object())


@pytest.mark.asyncio
async def test_save_requires_edit_and_exact_preview():
    service, row = setup_service()
    body = SaveOkfContextRequest(**row.selection, expected_manifest_sha256="c"*64)
    with pytest.raises(ConflictError):
        await service.save(case_id=uuid.uuid4(), body=body, user=object())
    service.preparation._require_editable_case.assert_awaited_once()
    service.db.execute.assert_not_awaited()
    body.expected_manifest_sha256 = row.manifest_sha256
    result = await service.save(case_id=uuid.uuid4(), body=body,
                                user=SimpleNamespace(id=uuid.uuid4()))
    assert result.id == row.id
    service.db.commit.assert_awaited_once()
    assert isinstance(service.preview.call_args.kwargs['body'], PrepareOkfExportPreviewRequest)
