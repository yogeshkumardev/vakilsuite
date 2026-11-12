from __future__ import annotations
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.features.fees.models import FeeEntryType


class FeeAgreementIn(BaseModel):
    agreed_amount_paise: int = Field(gt=0, le=1_000_000_000)


class FeeEntryIn(BaseModel):
    entry_type: FeeEntryType
    amount_paise: int = Field(gt=0, le=1_000_000_000)
    idempotency_key: str = Field(min_length=8, max_length=100)
    reverses_entry_id: uuid.UUID | None = None


class FeeAgreementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    chamber_id: uuid.UUID
    matter_id: uuid.UUID
    agreed_amount_paise: int
    currency: str
    created_at: datetime


class FeeEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    agreement_id: uuid.UUID
    matter_id: uuid.UUID
    entry_type: FeeEntryType
    amount_paise: int
    reverses_entry_id: uuid.UUID | None
    created_at: datetime


class FeeLedgerOut(BaseModel):
    agreement: FeeAgreementOut
    entries: list[FeeEntryOut]
    collected_paise: int
    outstanding_paise: int
