from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.features.chambers.models import (
    Chamber,
    ChamberMembership,
    ChamberRole,
    MembershipStatus,
)
from app.features.chambers.audit import ChamberAuditEventType
from app.features.chambers.audit_service import record_audit_event
from app.features.chambers.permissions import ChamberCapability, has_capability
from app.features.users.models import User


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def create_chamber(
    db: AsyncSession, *, owner_id: uuid.UUID, name: str, slug: str
) -> Chamber:
    existing = await db.scalar(select(Chamber.id).where(Chamber.slug == slug))
    if existing is not None:
        raise ConflictError("Chamber slug already exists")
    chamber = Chamber(name=name.strip(), slug=slug, owner_user_id=owner_id)
    db.add(chamber)
    await db.flush()
    db.add(
        ChamberMembership(
            chamber_id=chamber.id,
            user_id=owner_id,
            role=ChamberRole.owner,
        )
    )
    await db.flush()
    return chamber


async def list_chambers_for_user(
    db: AsyncSession, *, user_id: uuid.UUID
) -> list[tuple[Chamber, ChamberMembership]]:
    rows = await db.execute(
        select(Chamber, ChamberMembership)
        .join(ChamberMembership, ChamberMembership.chamber_id == Chamber.id)
        .where(ChamberMembership.user_id == user_id, ChamberMembership.status == MembershipStatus.active)
        .order_by(Chamber.created_at, Chamber.id)
    )
    return list(rows.tuples())


async def get_active_membership(
    db: AsyncSession, *, chamber_id: uuid.UUID, user_id: uuid.UUID
) -> ChamberMembership:
    membership = await db.scalar(
        select(ChamberMembership).where(
            ChamberMembership.chamber_id == chamber_id,
            ChamberMembership.user_id == user_id,
            ChamberMembership.status == MembershipStatus.active,
        )
    )
    if membership is None:
        raise NotFoundError("Chamber not found")
    return membership


async def require_capability(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    user_id: uuid.UUID,
    capability: ChamberCapability,
) -> ChamberMembership:
    membership = await get_active_membership(db, chamber_id=chamber_id, user_id=user_id)
    if not has_capability(membership.role, capability):
        raise ForbiddenError("Chamber capability required")
    return membership


async def resolve_single_capable_chamber(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    capability: ChamberCapability,
) -> Chamber:
    """Resolve the legacy/default chamber only when that choice is unambiguous.

    S02-04 will send an explicit selected chamber from web and Android.  Until
    then, silently choosing between two chambers would create tenant mistakes,
    so only exactly one capable active membership is accepted.
    """
    rows = await db.execute(
        select(Chamber, ChamberMembership)
        .join(ChamberMembership, ChamberMembership.chamber_id == Chamber.id)
        .where(
            ChamberMembership.user_id == user_id,
            ChamberMembership.status == MembershipStatus.active,
        )
        .order_by(Chamber.created_at, Chamber.id)
    )
    capable = [
        chamber
        for chamber, membership in rows.tuples()
        if has_capability(membership.role, capability)
    ]
    if not capable:
        raise NotFoundError("No active chamber with the required capability")
    if len(capable) > 1:
        raise ValidationError("Chamber selection is required")
    return capable[0]


async def resolve_capable_chamber(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    capability: ChamberCapability,
    chamber_id: uuid.UUID | None,
) -> Chamber:
    """Resolve an explicit chamber, or a safe legacy default when omitted."""
    if chamber_id is None:
        return await resolve_single_capable_chamber(
            db, user_id=user_id, capability=capability
        )
    await require_capability(
        db, chamber_id=chamber_id, user_id=user_id, capability=capability
    )
    chamber = await db.get(Chamber, chamber_id)
    if chamber is None:
        raise NotFoundError("Chamber not found")
    return chamber


async def provision_personal_chamber(db: AsyncSession, *, user: User) -> Chamber | None:
    """Give a newly registered account one safe default chamber.

    Existing records are handled by the explicit S02-02 backfill.  This helper
    only prevents *new* accounts from creating unscoped cases before the
    chamber-switcher UI exists.
    """
    existing = await db.scalar(
        select(ChamberMembership.id).where(ChamberMembership.user_id == user.id)
    )
    if existing is not None:
        return None
    name = f"{user.full_name.strip()[:170]} Chamber"
    return await create_chamber(
        db,
        owner_id=user.id,
        name=name,
        slug=f"personal-{user.id.hex}",
    )


async def add_member(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    actor_id: uuid.UUID,
    user_id: uuid.UUID,
    role: ChamberRole,
) -> ChamberMembership:
    await require_capability(
        db, chamber_id=chamber_id, user_id=actor_id, capability=ChamberCapability.chamber_manage
    )
    existing = await db.scalar(
        select(ChamberMembership).where(
            ChamberMembership.chamber_id == chamber_id, ChamberMembership.user_id == user_id
        )
    )
    if existing is not None:
        raise ConflictError("User is already or was previously a chamber member")
    if await db.get(User, user_id) is None:
        raise NotFoundError("User not found")
    membership = ChamberMembership(chamber_id=chamber_id, user_id=user_id, role=role)
    db.add(membership)
    await db.flush()
    await record_audit_event(
        db,
        chamber_id=chamber_id,
        actor_user_id=actor_id,
        event_type=ChamberAuditEventType.membership_added,
        resource_type="chamber",
        resource_id=chamber_id,
        subject_user_id=user_id,
        metadata={"role": role.value},
    )
    return membership


async def list_members(
    db: AsyncSession, *, chamber_id: uuid.UUID, actor_id: uuid.UUID
) -> list[ChamberMembership]:
    await require_capability(
        db, chamber_id=chamber_id, user_id=actor_id, capability=ChamberCapability.chamber_manage
    )
    rows = await db.scalars(
        select(ChamberMembership)
        .where(ChamberMembership.chamber_id == chamber_id)
        .order_by(ChamberMembership.created_at, ChamberMembership.id)
    )
    return list(rows)


async def update_member(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    membership_id: uuid.UUID,
    actor_id: uuid.UUID,
    role: ChamberRole | None,
    revoke: bool | None,
) -> ChamberMembership:
    await require_capability(
        db, chamber_id=chamber_id, user_id=actor_id, capability=ChamberCapability.chamber_manage
    )
    membership = await db.scalar(
        select(ChamberMembership)
        .where(ChamberMembership.id == membership_id, ChamberMembership.chamber_id == chamber_id)
        .with_for_update()
    )
    if membership is None:
        raise NotFoundError("Chamber member not found")
    if membership.role == ChamberRole.owner:
        raise ForbiddenError("Chamber owner membership cannot be changed here")
    previous_role = membership.role
    if role is not None:
        membership.role = role
    if revoke is True and membership.status == MembershipStatus.active:
        membership.status = MembershipStatus.revoked
        membership.revoked_at = _utcnow()
    await db.flush()
    if revoke is True:
        await record_audit_event(
            db,
            chamber_id=chamber_id,
            actor_user_id=actor_id,
            event_type=ChamberAuditEventType.membership_revoked,
            resource_type="chamber",
            resource_id=chamber_id,
            subject_user_id=membership.user_id,
            metadata={"previous_role": previous_role.value},
        )
    elif role is not None and role != previous_role:
        await record_audit_event(
            db,
            chamber_id=chamber_id,
            actor_user_id=actor_id,
            event_type=ChamberAuditEventType.membership_role_changed,
            resource_type="chamber",
            resource_id=chamber_id,
            subject_user_id=membership.user_id,
            metadata={"previous_role": previous_role.value, "role": role.value},
        )
    return membership
