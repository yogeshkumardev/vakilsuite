"""Opt-in PostgreSQL tests for additive S02 chamber foundation."""

from __future__ import annotations

import os
import uuid

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

if os.environ.get("RUN_CHAMBER_INTEGRATION_TESTS") != "1":
    pytest.skip("Set RUN_CHAMBER_INTEGRATION_TESTS=1 for chamber integration tests", allow_module_level=True)

import app.db.registry  # noqa: F401 - standalone relationship registration
from app.core.config import settings
from app.core.exceptions import ForbiddenError, NotFoundError
from app.features.chambers.models import Chamber, ChamberRole
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import (
    add_member,
    create_chamber,
    get_active_membership,
    require_capability,
    resolve_single_capable_chamber,
    update_member,
)
from app.features.cases.models import Case, CaseType
from app.features.cases.repository import CaseRepository
from app.features.users.models import User


@pytest.mark.asyncio
async def test_membership_capabilities_and_revocation_are_chamber_scoped() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    ids = [uuid.uuid4() for _ in range(4)]
    owner_id, staff_id, reviewer_id, outsider_id = ids
    chamber_id: uuid.UUID | None = None
    case_id: uuid.UUID | None = None
    try:
        async with factory.begin() as db:
            for user_id in ids:
                db.add(User(id=user_id, full_name="Chamber Test", email=f"chamber-{user_id}@example.test"))
            chamber = await create_chamber(
                db, owner_id=owner_id, name="Synthetic Chamber", slug=f"synthetic-{owner_id.hex[:8]}"
            )
            chamber_id = chamber.id
            staff = await add_member(
                db, chamber_id=chamber.id, actor_id=owner_id, user_id=staff_id, role=ChamberRole.staff
            )
            await add_member(
                db, chamber_id=chamber.id, actor_id=owner_id, user_id=reviewer_id, role=ChamberRole.reviewer
            )
            case = Case(
                lawyer_id=owner_id,
                chamber_id=chamber.id,
                case_title="Scoped synthetic case",
                case_type=CaseType.other,
                petitioner_name="Petitioner",
                respondent_name="Respondent",
            )
            db.add(case)
            await db.flush()
            case_id = case.id

        async with factory.begin() as db:
            with pytest.raises(ForbiddenError):
                await require_capability(
                    db, chamber_id=chamber_id, user_id=staff_id, capability=ChamberCapability.review_decide
                )
            await require_capability(
                db, chamber_id=chamber_id, user_id=reviewer_id, capability=ChamberCapability.review_decide
            )
            assert (
                await resolve_single_capable_chamber(
                    db, user_id=owner_id, capability=ChamberCapability.case_write
                )
            ).id == chamber_id
            cases = CaseRepository(db)
            assert await cases.can_access(case_id, staff_id)
            assert await cases.can_edit(case_id, staff_id)
            assert await cases.can_access(case_id, reviewer_id)
            assert not await cases.can_edit(case_id, reviewer_id)
            assert not await cases.can_access(case_id, outsider_id)
            with pytest.raises(NotFoundError):
                await get_active_membership(db, chamber_id=chamber_id, user_id=outsider_id)
            await update_member(
                db, chamber_id=chamber_id, membership_id=staff.id, actor_id=owner_id, role=None, revoke=True
            )

        async with factory.begin() as db:
            with pytest.raises(NotFoundError):
                await get_active_membership(db, chamber_id=chamber_id, user_id=staff_id)
            assert not await CaseRepository(db).can_access(case_id, staff_id)
    finally:
        if chamber_id is not None:
            async with factory.begin() as db:
                if case_id is not None:
                    await db.execute(delete(Case).where(Case.id == case_id))
                await db.execute(delete(Chamber).where(Chamber.id == chamber_id))
                await db.execute(delete(User).where(User.id.in_(ids)))
        await engine.dispose()
