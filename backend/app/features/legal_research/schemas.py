"""Public, non-secret legal research contracts."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LegalResearchConfigResponse(BaseModel):
    available: bool
    reason: str | None = None
    max_search_pages: int = Field(ge=1)
    max_selected_authorities: int = Field(ge=1)
    rate_card_version: str
    attribution_required: bool = True


class CreateResearchRunRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    idempotency_key: str = Field(min_length=8, max_length=128, pattern=r"^[A-Za-z0-9._:-]+$")
    budget_paise: int = Field(default=50, ge=1, le=10_000)


class LegalResearchRunResponse(BaseModel):
    id: uuid.UUID
    status: str
    query: str
    budget_paise: int
    reserved_paise: int
    spent_estimate_paise: int
    error_code: str | None
    results: list[dict] = Field(default_factory=list)


class CreatePropositionRequest(BaseModel):
    authority_version_id: uuid.UUID
    passage_id: uuid.UUID
    text: str = Field(min_length=10, max_length=20_000)


class PropositionResponse(BaseModel):
    id: uuid.UUID
    authority_version_id: uuid.UUID
    passage_id: uuid.UUID
    text: str
    text_hash: str
    review_id: uuid.UUID
    review_action: str
    review_version: int
    created_at: datetime


class DecideAuthorityReviewRequest(BaseModel):
    action: Literal["approved", "rejected", "changes_requested", "revoked"]
    expected_version: int = Field(ge=1)
    treatment_notes: str | None = Field(default=None, max_length=4000)


class FetchAuthorityRequest(BaseModel):
    run_id: uuid.UUID
    include_fragment: bool = True


class AuthorityPassageRequest(BaseModel):
    authority_version_id: uuid.UUID
    start_offset: int = Field(ge=0)
    end_offset: int = Field(gt=0)
    paragraph_label: str | None = Field(default=None, max_length=100)


class AuthorityResponse(BaseModel):
    id: uuid.UUID
    upstream_document_id: int
    canonical_url: str
    current_version_id: uuid.UUID | None
    text: str | None = None


class AuthorityPassageResponse(BaseModel):
    id: uuid.UUID
    authority_version_id: uuid.UUID
    text: str
    text_hash: str
    start_offset: int
    end_offset: int
    paragraph_label: str | None
    locator_valid: bool


class CreateAuthorityManifestRequest(BaseModel):
    review_ids: list[uuid.UUID] = Field(min_length=1, max_length=20)


class AuthorityManifestResponse(BaseModel):
    id: uuid.UUID
    context_hash: str
    references: list[dict]
    is_stale: bool


class AuthorityReviewResponse(BaseModel):
    id: uuid.UUID
    proposition_id: uuid.UUID
    action: str
    version: int
    treatment_notes: str | None
    decided_by_user_id: uuid.UUID | None
    decided_at: datetime | None
