"""Use cases for immutable chamber provider-policy versions."""

from __future__ import annotations

import uuid

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.features.chambers.models import Chamber
from app.features.chambers.provider_policy import ChamberProviderPolicyVersion
from app.features.chambers.schemas import (
    ChamberProviderPolicyIn,
    ChamberProviderPolicyOut,
    PolicyCapabilityOut,
    ProviderTaskPolicyOut,
)
from app.features.summaries.models import SummaryRun, SummaryRunStatus


def default_policy() -> ChamberProviderPolicyIn:
    """Safe policy returned until a manager makes an explicit decision.

    No external data processing, collection access, capability, provider route,
    or paid submission is enabled by default.
    """
    return ChamberProviderPolicyIn()


def _policy_from_snapshot(snapshot: dict) -> ChamberProviderPolicyIn:
    return ChamberProviderPolicyIn.model_validate(snapshot)


def policy_out(
    policy: ChamberProviderPolicyIn,
    *,
    version: int,
    policy_id: uuid.UUID | None,
    created_by_user_id: uuid.UUID | None,
    created_at=None,
) -> ChamberProviderPolicyOut:
    return ChamberProviderPolicyOut(
        id=policy_id,
        version=version,
        external_processing_allowed=policy.external_processing_allowed,
        permitted_data_classes=policy.permitted_data_classes,
        allowed_collection_ids=policy.allowed_collection_ids,
        capabilities=PolicyCapabilityOut.model_validate(policy.capabilities.model_dump()),
        task_policies=[
            ProviderTaskPolicyOut.model_validate(item.model_dump())
            for item in policy.task_policies
        ],
        created_by_user_id=created_by_user_id,
        created_at=created_at,
    )


async def get_active_policy(
    db: AsyncSession, *, chamber_id: uuid.UUID, lock: bool = False
) -> ChamberProviderPolicyVersion | None:
    statement = select(ChamberProviderPolicyVersion).where(
        ChamberProviderPolicyVersion.chamber_id == chamber_id,
        ChamberProviderPolicyVersion.is_active.is_(True),
    )
    if lock:
        statement = statement.with_for_update()
    return await db.scalar(statement)


async def get_policy_output(
    db: AsyncSession, *, chamber_id: uuid.UUID
) -> ChamberProviderPolicyOut:
    current = await get_active_policy(db, chamber_id=chamber_id)
    if current is None:
        return policy_out(default_policy(), version=0, policy_id=None, created_by_user_id=None)
    return policy_out(
        _policy_from_snapshot(current.policy_json),
        version=current.version,
        policy_id=current.id,
        created_by_user_id=current.created_by_user_id,
        created_at=current.created_at,
    )


async def replace_policy(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    policy: ChamberProviderPolicyIn,
) -> ChamberProviderPolicyOut:
    """Make a new current policy snapshot under a chamber row lock."""
    # Serialize policy writers even before looking up the current active row;
    # this prevents two concurrent updates from both selecting version N+1.
    chamber = await db.scalar(select(Chamber).where(Chamber.id == chamber_id).with_for_update())
    if chamber is None:
        # The route has already authorized chamber membership. Do not expose a
        # distinction between a deleted/guessed chamber and authorization.
        raise ForbiddenError("Chamber policy cannot be changed")

    current = await get_active_policy(db, chamber_id=chamber_id, lock=True)
    if current is not None:
        current.is_active = False
    next_version = 1 if current is None else current.version + 1
    created = ChamberProviderPolicyVersion(
        chamber_id=chamber_id,
        version=next_version,
        policy_json=policy.model_dump(mode="json"),
        previous_policy_id=current.id if current else None,
        created_by_user_id=actor_user_id,
    )
    db.add(created)
    await db.flush()
    # A run is bound to the complete immutable policy version used at
    # preparation.  Leaving an old pending/running run actionable after a
    # replacement would only produce a late conflict (or invite a stale queue
    # delivery), so make it visibly stale as part of the same transaction.
    await db.execute(
        update(SummaryRun)
        .where(
            SummaryRun.chamber_id == chamber_id,
            SummaryRun.status.in_(
                (SummaryRunStatus.pending, SummaryRunStatus.running)
            ),
        )
        .values(
            status=SummaryRunStatus.stale,
            error_code="POLICY_CHANGED",
        )
    )
    return policy_out(
        policy,
        version=created.version,
        policy_id=created.id,
        created_by_user_id=created.created_by_user_id,
        created_at=created.created_at,
    )


async def resolve_authorized_task_policy(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    operation: str,
    data_class: str,
    collection_id: uuid.UUID | None,
) -> ProviderTaskPolicyOut:
    """Future provider workers call this after their own source authorization.

    This helper is intentionally not exposed to clients.  It verifies the
    server-known chamber and operation against the active policy and does not
    make a provider request.  Collection IDs are an allow-list boundary, not a
    substitute for S07's collection/revision permission checks.
    """
    output = await get_policy_output(db, chamber_id=chamber_id)
    if not output.external_processing_allowed or data_class not in {
        item.value for item in output.permitted_data_classes
    }:
        raise ForbiddenError("External data processing is not authorized by the chamber policy")
    if collection_id is not None and collection_id not in output.allowed_collection_ids:
        raise ForbiddenError("Knowledge collection is not authorized by the chamber policy")
    for task_policy in output.task_policies:
        if task_policy.operation.value == operation:
            return task_policy
    raise ForbiddenError("Provider operation is not authorized by the chamber policy")
