from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import ForbiddenError
from app.features.chambers.schemas import (
    AddMemberIn,
    ChamberOut,
    ChamberWithMembershipOut,
    CreateChamberIn,
    MembershipOut,
    ChamberAuditEventOut,
    ChamberProviderPolicyIn,
    ChamberProviderPolicyOut,
    UpdateMemberIn,
)
from app.features.chambers.service import (
    add_member,
    create_chamber,
    get_active_membership,
    list_chambers_for_user,
    list_members,
    update_member,
)
from app.features.chambers.audit import ChamberAuditEventType
from app.features.chambers.audit_service import list_audit_events, record_audit_event
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.chambers.provider_policy_service import get_policy_output, replace_policy
from app.features.users.models import UserRole

router = APIRouter(prefix="/chambers", tags=["Chambers"])


@router.post(
    "",
    status_code=201,
    response_model=SuccessResponse[ChamberWithMembershipOut],
    operation_id="chambers_create",
    responses=ERROR_RESPONSES,
)
async def create_chamber_route(
    body: CreateChamberIn, current_user: CurrentUser, db: DB
) -> SuccessResponse[ChamberWithMembershipOut]:
    if current_user.role not in {UserRole.lawyer, UserRole.admin}:
        raise ForbiddenError("Lawyer account required to create a chamber")
    chamber = await create_chamber(
        db, owner_id=current_user.id, name=body.name, slug=body.slug
    )
    await record_audit_event(
        db,
        chamber_id=chamber.id,
        actor_user_id=current_user.id,
        event_type=ChamberAuditEventType.chamber_created,
        resource_type="chamber",
        resource_id=chamber.id,
    )
    # The owner membership is created atomically with the chamber.
    membership = await get_active_membership(
        db, chamber_id=chamber.id, user_id=current_user.id
    )
    return {
        "success": True,
        "data": ChamberWithMembershipOut(
            **ChamberOut.model_validate(chamber).model_dump(),
            membership=MembershipOut.model_validate(membership),
        ),
    }


@router.get(
    "",
    response_model=SuccessResponse[list[ChamberWithMembershipOut]],
    operation_id="chambers_list_mine",
    responses=ERROR_RESPONSES,
)
async def list_my_chambers(
    current_user: CurrentUser, db: DB
) -> SuccessResponse[list[ChamberWithMembershipOut]]:
    rows = await list_chambers_for_user(db, user_id=current_user.id)
    return {
        "success": True,
        "data": [
            ChamberWithMembershipOut(
                **ChamberOut.model_validate(chamber).model_dump(),
                membership=MembershipOut.model_validate(membership),
            )
            for chamber, membership in rows
        ],
    }


@router.post(
    "/{chamber_id}/members",
    status_code=201,
    response_model=SuccessResponse[MembershipOut],
    operation_id="chambers_add_member",
    responses=ERROR_RESPONSES,
)
async def add_chamber_member(
    chamber_id: uuid.UUID,
    body: AddMemberIn,
    current_user: CurrentUser,
    db: DB,
) -> SuccessResponse[MembershipOut]:
    membership = await add_member(
        db,
        chamber_id=chamber_id,
        actor_id=current_user.id,
        user_id=body.user_id,
        role=body.role,
    )
    return {"success": True, "data": MembershipOut.model_validate(membership)}


@router.get(
    "/{chamber_id}/members",
    response_model=SuccessResponse[list[MembershipOut]],
    operation_id="chambers_list_members",
    responses=ERROR_RESPONSES,
)
async def list_chamber_members(
    chamber_id: uuid.UUID, current_user: CurrentUser, db: DB
) -> SuccessResponse[list[MembershipOut]]:
    members = await list_members(db, chamber_id=chamber_id, actor_id=current_user.id)
    return {"success": True, "data": [MembershipOut.model_validate(member) for member in members]}


@router.get(
    "/{chamber_id}/audit-events",
    response_model=SuccessResponse[list[ChamberAuditEventOut]],
    operation_id="chambers_list_audit_events",
    responses=ERROR_RESPONSES,
)
async def list_chamber_audit_events(
    chamber_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    limit: int = Query(default=50, ge=1, le=100),
) -> SuccessResponse[list[ChamberAuditEventOut]]:
    await require_capability(
        db,
        chamber_id=chamber_id,
        user_id=current_user.id,
        capability=ChamberCapability.chamber_manage,
    )
    events = await list_audit_events(db, chamber_id=chamber_id, limit=limit)
    return {"success": True, "data": [ChamberAuditEventOut.model_validate(event) for event in events]}


@router.get(
    "/{chamber_id}/provider-policy",
    response_model=SuccessResponse[ChamberProviderPolicyOut],
    operation_id="chambers_get_provider_policy",
    responses=ERROR_RESPONSES,
)
async def get_chamber_provider_policy(
    chamber_id: uuid.UUID, current_user: CurrentUser, db: DB
) -> SuccessResponse[ChamberProviderPolicyOut]:
    await require_capability(
        db,
        chamber_id=chamber_id,
        user_id=current_user.id,
        capability=ChamberCapability.provider_policy_manage,
    )
    return {"success": True, "data": await get_policy_output(db, chamber_id=chamber_id)}


@router.put(
    "/{chamber_id}/provider-policy",
    response_model=SuccessResponse[ChamberProviderPolicyOut],
    operation_id="chambers_replace_provider_policy",
    responses=ERROR_RESPONSES,
)
async def replace_chamber_provider_policy(
    chamber_id: uuid.UUID,
    body: ChamberProviderPolicyIn,
    current_user: CurrentUser,
    db: DB,
) -> SuccessResponse[ChamberProviderPolicyOut]:
    await require_capability(
        db,
        chamber_id=chamber_id,
        user_id=current_user.id,
        capability=ChamberCapability.provider_policy_manage,
    )
    return {
        "success": True,
        "data": await replace_policy(
            db,
            chamber_id=chamber_id,
            actor_user_id=current_user.id,
            policy=body,
        ),
    }


@router.patch(
    "/{chamber_id}/members/{membership_id}",
    response_model=SuccessResponse[MembershipOut],
    operation_id="chambers_update_member",
    responses=ERROR_RESPONSES,
)
async def update_chamber_member(
    chamber_id: uuid.UUID,
    membership_id: uuid.UUID,
    body: UpdateMemberIn,
    current_user: CurrentUser,
    db: DB,
) -> SuccessResponse[MembershipOut]:
    membership = await update_member(
        db,
        chamber_id=chamber_id,
        membership_id=membership_id,
        actor_id=current_user.id,
        role=body.role,
        revoke=body.revoke,
    )
    return {"success": True, "data": MembershipOut.model_validate(membership)}
