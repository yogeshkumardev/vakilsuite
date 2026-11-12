"""Static chamber capabilities. Platform administration remains a user role."""

from __future__ import annotations

import enum

from app.features.chambers.models import ChamberRole


class ChamberCapability(str, enum.Enum):
    chamber_manage = "chamber_manage"
    case_read = "case_read"
    case_write = "case_write"
    document_read = "document_read"
    document_write = "document_write"
    review_decide = "review_decide"
    workflow_resume = "workflow_resume"
    fee_read = "fee_read"
    fee_write = "fee_write"
    provider_policy_manage = "provider_policy_manage"
    legal_research_read = "legal_research_read"
    legal_research_run = "legal_research_run"


ROLE_CAPABILITIES: dict[ChamberRole, frozenset[ChamberCapability]] = {
    ChamberRole.owner: frozenset(ChamberCapability),
    ChamberRole.admin: frozenset(
        {
            ChamberCapability.chamber_manage,
            ChamberCapability.case_read,
            ChamberCapability.case_write,
            ChamberCapability.document_read,
            ChamberCapability.document_write,
            ChamberCapability.review_decide,
            ChamberCapability.workflow_resume,
            ChamberCapability.fee_read,
            ChamberCapability.fee_write,
            ChamberCapability.provider_policy_manage,
            ChamberCapability.legal_research_read,
            ChamberCapability.legal_research_run,
        }
    ),
    ChamberRole.staff: frozenset(
        {
            ChamberCapability.case_read,
            ChamberCapability.case_write,
            ChamberCapability.document_read,
            ChamberCapability.document_write,
            ChamberCapability.legal_research_read,
            ChamberCapability.legal_research_run,
        }
    ),
    ChamberRole.reviewer: frozenset(
        {
            ChamberCapability.case_read,
            ChamberCapability.document_read,
            ChamberCapability.review_decide,
            ChamberCapability.workflow_resume,
            ChamberCapability.legal_research_read,
        }
    ),
}


def has_capability(role: ChamberRole, capability: ChamberCapability) -> bool:
    return capability in ROLE_CAPABILITIES[role]
