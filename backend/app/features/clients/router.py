from __future__ import annotations

import uuid

from fastapi import APIRouter, Header, Query

from app.core.api_responses import ERROR_RESPONSES, EmptyData, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.features.clients.schemas import (
    ClientCaseLinkCreateIn,
    ClientCaseLinkOut,
    ClientCreateIn,
    ClientOut,
    ClientUpdateIn,
)
from app.features.clients.service import ClientService

router = APIRouter(prefix="/clients", tags=["Clients"])
case_clients_router = APIRouter(prefix="/cases", tags=["Case Clients"])


def selected_chamber_id(x_chamber_id: uuid.UUID | None) -> uuid.UUID:
    if x_chamber_id is None:
        # Client identity is always tenant scoped. Unlike legacy case routes it
        # never guesses a default chamber from a multi-chamber account.
        from app.core.exceptions import ValidationError

        raise ValidationError("X-Chamber-Id is required")
    return x_chamber_id


@router.get("", response_model=SuccessResponse[list[ClientOut]], operation_id="clients_list", responses=ERROR_RESPONSES)
async def list_clients(
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
    search: str | None = Query(default=None, max_length=200),
    limit: int = Query(default=20, ge=1, le=100),
) -> SuccessResponse[list[ClientOut]]:
    return {
        "success": True,
        "data": await ClientService(db).list_clients(
            current_user=current_user,
            chamber_id=selected_chamber_id(x_chamber_id),
            search=search,
            limit=limit,
        ),
    }


@router.post("", status_code=201, response_model=SuccessResponse[ClientOut], operation_id="clients_create", responses=ERROR_RESPONSES)
async def create_client(
    body: ClientCreateIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[ClientOut]:
    return {
        "success": True,
        "data": await ClientService(db).create_client(
            current_user=current_user,
            chamber_id=selected_chamber_id(x_chamber_id),
            data=body,
        ),
    }


@router.patch("/{client_id}", response_model=SuccessResponse[ClientOut], operation_id="clients_update", responses=ERROR_RESPONSES)
async def update_client(
    client_id: uuid.UUID,
    body: ClientUpdateIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[ClientOut]:
    return {
        "success": True,
        "data": await ClientService(db).update_client(
            current_user=current_user,
            chamber_id=selected_chamber_id(x_chamber_id),
            client_id=client_id,
            data=body,
        ),
    }


@case_clients_router.get("/{case_id}/clients", response_model=SuccessResponse[list[ClientCaseLinkOut]], operation_id="case_clients_list", responses=ERROR_RESPONSES)
async def list_case_clients(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[list[ClientCaseLinkOut]]:
    return {
        "success": True,
        "data": await ClientService(db).list_case_clients(
            current_user=current_user,
            chamber_id=selected_chamber_id(x_chamber_id),
            case_id=case_id,
        ),
    }


@case_clients_router.post("/{case_id}/clients", status_code=201, response_model=SuccessResponse[ClientCaseLinkOut], operation_id="case_clients_link", responses=ERROR_RESPONSES)
async def link_case_client(
    case_id: uuid.UUID,
    body: ClientCaseLinkCreateIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[ClientCaseLinkOut]:
    return {
        "success": True,
        "data": await ClientService(db).link_client(
            current_user=current_user,
            chamber_id=selected_chamber_id(x_chamber_id),
            case_id=case_id,
            data=body,
        ),
    }


@case_clients_router.delete("/{case_id}/clients/{client_id}", response_model=SuccessResponse[EmptyData], operation_id="case_clients_unlink", responses=ERROR_RESPONSES)
async def unlink_case_client(
    case_id: uuid.UUID,
    client_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[EmptyData]:
    await ClientService(db).unlink_client(
        current_user=current_user,
        chamber_id=selected_chamber_id(x_chamber_id),
        case_id=case_id,
        client_id=client_id,
    )
    return {"success": True, "data": {}}
