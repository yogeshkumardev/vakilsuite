from __future__ import annotations
import uuid
from fastapi import APIRouter, Header
from sqlalchemy import select
from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.features.cases.models import Case
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.fees.models import FeeAgreement, FeeEntryType, FeeLedgerEntry
from app.features.fees.schemas import (
    FeeAgreementIn,
    FeeAgreementOut,
    FeeEntryIn,
    FeeEntryOut,
    FeeLedgerOut,
)

router = APIRouter(prefix="/matters", tags=["Fees"])


def chamber(value: uuid.UUID | None) -> uuid.UUID:
    if value is None:
        raise ValidationError("X-Chamber-Id is required")
    return value


async def matter(db, user, chamber_id, matter_id, capability):
    await require_capability(
        db, chamber_id=chamber_id, user_id=user.id, capability=capability
    )
    row = await db.scalar(
        select(Case).where(
            Case.id == matter_id,
            Case.chamber_id == chamber_id,
            Case.deleted_at.is_(None),
        )
    )
    if row is None:
        raise NotFoundError("Matter not found")
    return row


@router.post(
    "/{matter_id}/fee-agreements",
    status_code=201,
    response_model=SuccessResponse[FeeAgreementOut],
    operation_id="fees_create_agreement",
    responses=ERROR_RESPONSES,
)
async def create_agreement(
    matter_id: uuid.UUID,
    body: FeeAgreementIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    cid = chamber(x_chamber_id)
    await matter(db, current_user, cid, matter_id, ChamberCapability.fee_write)
    item = FeeAgreement(
        chamber_id=cid,
        matter_id=matter_id,
        agreed_amount_paise=body.agreed_amount_paise,
        created_by_user_id=current_user.id,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return {"success": True, "data": FeeAgreementOut.model_validate(item)}


@router.get(
    "/{matter_id}/fee-ledger",
    response_model=SuccessResponse[FeeLedgerOut],
    operation_id="fees_get_ledger",
    responses=ERROR_RESPONSES,
)
async def get_ledger(
    matter_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    cid = chamber(x_chamber_id)
    await matter(db, current_user, cid, matter_id, ChamberCapability.fee_read)
    agreement = await db.scalar(
        select(FeeAgreement)
        .where(FeeAgreement.chamber_id == cid, FeeAgreement.matter_id == matter_id)
        .order_by(FeeAgreement.created_at.desc())
    )
    if agreement is None:
        raise NotFoundError("Fee agreement not found")
    entries = list(
        (
            await db.scalars(
                select(FeeLedgerEntry)
                .where(FeeLedgerEntry.agreement_id == agreement.id)
                .order_by(FeeLedgerEntry.created_at, FeeLedgerEntry.id)
            )
        ).all()
    )
    total = sum(x.amount_paise for x in entries)
    return {
        "success": True,
        "data": FeeLedgerOut(
            agreement=FeeAgreementOut.model_validate(agreement),
            entries=[FeeEntryOut.model_validate(x) for x in entries],
            collected_paise=total,
            outstanding_paise=agreement.agreed_amount_paise - total,
        ),
    }


@router.post(
    "/{matter_id}/fee-agreements/{agreement_id}/entries",
    status_code=201,
    response_model=SuccessResponse[FeeEntryOut],
    operation_id="fees_post_entry",
    responses=ERROR_RESPONSES,
)
async def post_entry(
    matter_id: uuid.UUID,
    agreement_id: uuid.UUID,
    body: FeeEntryIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    cid = chamber(x_chamber_id)
    await matter(db, current_user, cid, matter_id, ChamberCapability.fee_write)
    agreement = await db.scalar(
        select(FeeAgreement).where(
            FeeAgreement.id == agreement_id,
            FeeAgreement.chamber_id == cid,
            FeeAgreement.matter_id == matter_id,
        )
    )
    if agreement is None:
        raise NotFoundError("Fee agreement not found")
    existing = await db.scalar(
        select(FeeLedgerEntry).where(
            FeeLedgerEntry.chamber_id == cid,
            FeeLedgerEntry.idempotency_key == body.idempotency_key,
        )
    )
    if existing:
        if (
            existing.agreement_id == agreement_id
            and existing.entry_type == body.entry_type
            and abs(existing.amount_paise) == body.amount_paise
        ):
            return {"success": True, "data": FeeEntryOut.model_validate(existing)}
        raise ConflictError("Idempotency key already used for another fee entry")
    if body.entry_type == FeeEntryType.payment:
        signed = body.amount_paise
    else:
        signed = -body.amount_paise
    if body.entry_type == FeeEntryType.reversal:
        if body.reverses_entry_id is None:
            raise ValidationError("reverses_entry_id is required for reversal")
        target = await db.scalar(
            select(FeeLedgerEntry).where(
                FeeLedgerEntry.id == body.reverses_entry_id,
                FeeLedgerEntry.agreement_id == agreement_id,
            )
        )
        if target is None or abs(target.amount_paise) != body.amount_paise:
            raise ValidationError("Reversal must match an agreement entry exactly")
        signed = -target.amount_paise
    elif body.reverses_entry_id is not None:
        raise ValidationError("reverses_entry_id is only allowed for reversal")
    entry = FeeLedgerEntry(
        chamber_id=cid,
        matter_id=matter_id,
        agreement_id=agreement_id,
        entry_type=body.entry_type,
        amount_paise=signed,
        idempotency_key=body.idempotency_key,
        reverses_entry_id=body.reverses_entry_id,
        created_by_user_id=current_user.id,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"success": True, "data": FeeEntryOut.model_validate(entry)}
