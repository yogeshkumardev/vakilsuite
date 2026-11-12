from __future__ import annotations
import uuid
from datetime import datetime
from fastapi import APIRouter, Header
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import NotFoundError, ValidationError
from app.features.cases.models import Case
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.receipts.models import CustodyKind, MatterCustodyItem


class CustodyIn(BaseModel):
    description: str = Field(min_length=1, max_length=500)
    kind: CustodyKind
    physical_location: str = Field(min_length=1, max_length=300)


class CustodyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    matter_id: uuid.UUID
    description: str
    kind: CustodyKind
    physical_location: str
    recorded_by_user_id: uuid.UUID
    recorded_at: datetime


router = APIRouter(prefix="/matters", tags=["Custody"])


async def scope(db, user, cid, matter_id, capability):
    if cid is None:
        raise ValidationError("X-Chamber-Id is required")
    await require_capability(db, chamber_id=cid, user_id=user.id, capability=capability)
    if (
        await db.scalar(
            select(Case.id).where(
                Case.id == matter_id, Case.chamber_id == cid, Case.deleted_at.is_(None)
            )
        )
        is None
    ):
        raise NotFoundError("Matter not found")
    return cid


@router.get(
    "/{matter_id}/custody-items",
    response_model=SuccessResponse[list[CustodyOut]],
    operation_id="custody_list",
    responses=ERROR_RESPONSES,
)
async def list_items(
    matter_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    cid = await scope(
        db, current_user, x_chamber_id, matter_id, ChamberCapability.document_read
    )
    rows = await db.scalars(
        select(MatterCustodyItem)
        .where(
            MatterCustodyItem.chamber_id == cid,
            MatterCustodyItem.matter_id == matter_id,
        )
        .order_by(MatterCustodyItem.recorded_at, MatterCustodyItem.id)
    )
    return {"success": True, "data": [CustodyOut.model_validate(x) for x in rows]}


@router.post(
    "/{matter_id}/custody-items",
    status_code=201,
    response_model=SuccessResponse[CustodyOut],
    operation_id="custody_create",
    responses=ERROR_RESPONSES,
)
async def create_item(
    matter_id: uuid.UUID,
    body: CustodyIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    cid = await scope(
        db, current_user, x_chamber_id, matter_id, ChamberCapability.document_write
    )
    item = MatterCustodyItem(
        chamber_id=cid,
        matter_id=matter_id,
        description=body.description.strip(),
        kind=body.kind,
        physical_location=body.physical_location.strip(),
        recorded_by_user_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"success": True, "data": CustodyOut.model_validate(item)}
