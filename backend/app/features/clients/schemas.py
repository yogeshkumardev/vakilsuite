from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.features.clients.models import ClientCaseRole


def normalize_search_text(value: str) -> str:
    return " ".join(value.casefold().split())


def normalize_optional(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


class ClientCreateIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=300)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=4_000)
    notes: str | None = Field(default=None, max_length=4_000)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if not value:
            raise ValueError("full_name is required")
        return value

    @field_validator("phone", "address", "notes", mode="before")
    @classmethod
    def normalize_optional_strings(cls, value: str | None) -> str | None:
        return normalize_optional(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[0-9+() .-]{5,40}", value):
            raise ValueError("phone contains unsupported characters")
        return value


class ClientUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=300)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    address: str | None = Field(default=None, max_length=4_000)
    notes: str | None = Field(default=None, max_length=4_000)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = " ".join(value.split())
        if not value:
            raise ValueError("full_name is required")
        return value

    @field_validator("phone", "address", "notes", mode="before")
    @classmethod
    def normalize_optional_strings(cls, value: str | None) -> str | None:
        return normalize_optional(value)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"[0-9+() .-]{5,40}", value):
            raise ValueError("phone contains unsupported characters")
        return value

    def model_post_init(self, __context) -> None:
        if "full_name" in self.model_fields_set and self.full_name is None:
            raise ValueError("full_name cannot be null")


class ClientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chamber_id: uuid.UUID
    full_name: str
    phone: str | None
    email: EmailStr | None
    address: str | None
    notes: str | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class ClientCaseLinkCreateIn(BaseModel):
    client_id: uuid.UUID
    role: ClientCaseRole = ClientCaseRole.client


class ClientCaseLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    client_id: uuid.UUID
    case_id: uuid.UUID
    role: ClientCaseRole
    linked_by_user_id: uuid.UUID
    linked_at: datetime
    client: ClientOut
