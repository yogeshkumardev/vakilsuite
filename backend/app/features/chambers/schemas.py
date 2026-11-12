from __future__ import annotations

import re
import uuid
from enum import Enum
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.features.chambers.audit import ChamberAuditEventType
from app.features.chambers.models import ChamberRole, MembershipStatus


class CreateChamberIn(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    slug: str = Field(min_length=3, max_length=80)

    @field_validator("slug")
    @classmethod
    def normalize_slug(cls, value: str) -> str:
        value = value.strip().lower()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", value):
            raise ValueError("slug must use lowercase letters, digits and hyphens")
        return value


class AddMemberIn(BaseModel):
    user_id: uuid.UUID
    role: ChamberRole


class UpdateMemberIn(BaseModel):
    role: ChamberRole | None = None
    revoke: bool | None = None


class ChamberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    owner_user_id: uuid.UUID
    created_at: datetime


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chamber_id: uuid.UUID
    user_id: uuid.UUID
    role: ChamberRole
    status: MembershipStatus
    joined_at: datetime
    revoked_at: datetime | None


class ChamberWithMembershipOut(ChamberOut):
    membership: MembershipOut


class ChamberAuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    chamber_id: uuid.UUID
    actor_user_id: uuid.UUID
    event_type: ChamberAuditEventType
    resource_type: str
    resource_id: uuid.UUID
    subject_user_id: uuid.UUID | None
    metadata_json: dict
    occurred_at: datetime


class ProviderName(str, Enum):
    sarvam = "sarvam"
    gemini = "gemini"
    openai = "openai"
    claude = "claude"


class ProviderOperation(str, Enum):
    transcription = "transcription"
    summary = "summary"
    draft = "draft"
    consistency_check = "consistency_check"
    embedding = "embedding"


class ProviderDataClass(str, Enum):
    approved_knowledge = "approved_knowledge"
    case_metadata = "case_metadata"
    document_text = "document_text"
    document_image = "document_image"
    draft_text = "draft_text"


class ProviderFallbackCondition(str, Enum):
    network_error = "network_error"
    rate_limited = "rate_limited"
    quota_exhausted = "quota_exhausted"
    invalid_output = "invalid_output"


class ProviderRouteIn(BaseModel):
    provider: ProviderName
    model: str = Field(min_length=1, max_length=160)

    @field_validator("model")
    @classmethod
    def normalize_model(cls, value: str) -> str:
        value = value.strip()
        if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9._:/-]*", value):
            raise ValueError("model must be a supported provider model identifier")
        return value


class ProviderTaskPolicyIn(BaseModel):
    operation: ProviderOperation
    providers: list[ProviderRouteIn] = Field(min_length=1, max_length=3)
    permitted_languages: list[str] = Field(default_factory=list, max_length=12)
    max_input_bytes: int = Field(ge=1, le=104_857_600)
    max_output_tokens: int = Field(ge=1, le=128_000)
    deadline_seconds: int = Field(ge=1, le=300)
    max_submissions: int = Field(ge=1, le=3)
    run_budget_paise: int = Field(ge=0, le=10_000_000)
    transcription_budget_paise_per_page: int | None = Field(
        default=None, ge=1, le=10000
    )
    fallback_conditions: list[ProviderFallbackCondition] = Field(
        default_factory=list, max_length=4
    )

    @field_validator("permitted_languages")
    @classmethod
    def normalize_languages(cls, values: list[str]) -> list[str]:
        normalized = [value.strip().lower() for value in values]
        if any(
            not re.fullmatch(r"[a-z]{2,3}(?:-[a-z0-9]{2,8})?", value)
            for value in normalized
        ):
            raise ValueError(
                "permitted_languages must use short language tags, for example hi or en-in"
            )
        if len(set(normalized)) != len(normalized):
            raise ValueError("permitted_languages must not contain duplicates")
        return normalized

    def model_post_init(self, __context) -> None:
        if (
            self.transcription_budget_paise_per_page is not None
            and self.operation != ProviderOperation.transcription
        ):
            raise ValueError("Per-page budgets are only supported for transcription")
        if len({(route.provider, route.model) for route in self.providers}) != len(
            self.providers
        ):
            raise ValueError(
                "providers must not contain duplicate provider/model routes"
            )
        if self.max_submissions > len(self.providers):
            raise ValueError(
                "max_submissions cannot exceed the authorized provider routes"
            )
        if len(self.providers) > 1 and not self.fallback_conditions:
            raise ValueError(
                "fallback_conditions are required when fallback providers are configured"
            )


class PolicyCapabilitiesIn(BaseModel):
    generation: bool = False
    review: bool = False
    indexing: bool = False
    export: bool = False


class ChamberProviderPolicyIn(BaseModel):
    external_processing_allowed: bool = False
    permitted_data_classes: list[ProviderDataClass] = Field(
        default_factory=list, max_length=5
    )
    allowed_collection_ids: list[uuid.UUID] = Field(
        default_factory=list, max_length=500
    )
    capabilities: PolicyCapabilitiesIn = Field(default_factory=PolicyCapabilitiesIn)
    task_policies: list[ProviderTaskPolicyIn] = Field(
        default_factory=list, max_length=5
    )

    def model_post_init(self, __context) -> None:
        if len(set(self.permitted_data_classes)) != len(self.permitted_data_classes):
            raise ValueError("permitted_data_classes must not contain duplicates")
        if len(set(self.allowed_collection_ids)) != len(self.allowed_collection_ids):
            raise ValueError("allowed_collection_ids must not contain duplicates")
        operations = [policy.operation for policy in self.task_policies]
        if len(set(operations)) != len(operations):
            raise ValueError("task_policies must have one policy per operation")
        enabled_capabilities = any(self.capabilities.model_dump().values())
        if not self.external_processing_allowed and (
            self.permitted_data_classes
            or self.allowed_collection_ids
            or self.task_policies
            or enabled_capabilities
        ):
            raise ValueError(
                "external_processing_allowed must be true before enabling provider data or capabilities"
            )
        if self.external_processing_allowed and not self.permitted_data_classes:
            raise ValueError(
                "permitted_data_classes are required when external processing is enabled"
            )
        if self.task_policies and not enabled_capabilities:
            raise ValueError(
                "enable a capability before configuring provider task policies"
            )
        required_capability = {
            ProviderOperation.transcription: "indexing",
            ProviderOperation.summary: "generation",
            ProviderOperation.draft: "generation",
            ProviderOperation.consistency_check: "review",
            ProviderOperation.embedding: "indexing",
        }
        for task_policy in self.task_policies:
            if not getattr(
                self.capabilities, required_capability[task_policy.operation]
            ):
                raise ValueError(
                    f"{task_policy.operation.value} requires the "
                    f"{required_capability[task_policy.operation]} capability"
                )


class ProviderRouteOut(ProviderRouteIn):
    pass


class ProviderTaskPolicyOut(ProviderTaskPolicyIn):
    pass


class PolicyCapabilityOut(PolicyCapabilitiesIn):
    pass


class ChamberProviderPolicyOut(BaseModel):
    id: uuid.UUID | None
    version: int
    external_processing_allowed: bool
    permitted_data_classes: list[ProviderDataClass]
    allowed_collection_ids: list[uuid.UUID]
    capabilities: PolicyCapabilityOut
    task_policies: list[ProviderTaskPolicyOut]
    created_by_user_id: uuid.UUID | None
    created_at: datetime | None
