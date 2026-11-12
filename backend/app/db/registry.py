# Central model registry — import ALL models here so that:
# 1. Alembic's env.py gets the full metadata for autogenerate
# 2. SQLAlchemy knows all tables before creating the engine
#
# Rule: every new model file MUST be imported here.

from app.db.base import Base  # noqa: F401  — re-export Base for env.py

# ── Feature models ─────────────────────────────────────────────────────────
from app.features.auth.models import AuthSession, AuthChallenge, AuthEmailOutbox, SpentRefreshToken, AuthWebhookEvent  # noqa: F401
from app.features.users.models import User  # noqa: F401
from app.features.cases.models import (  # noqa: F401
    Case,
    CaseNumber,
    CaseSection,
    CaseAccess,
    Party,
    Proceeding,
)
from app.features.documents.models import (  # noqa: F401
    Document,
    DocumentFileVersion,
    DocumentUploadSession,
    DocumentUploadPart,
    AnnexureItem,
    AnnexureDocumentRange,
    DocumentExtractionAttempt,
)
from app.features.jobs.models import Job  # noqa: F401  — S01-07 job queue
from app.features.workflows.models import (  # noqa: F401  — S01-09 workflow POC
    WorkflowOperation,
    WorkflowReview,
    WorkflowResumeIntent,
    WorkflowRun,
)
from app.features.chambers.models import Chamber, ChamberMembership  # noqa: F401  — S02-01
from app.features.chambers.audit import ChamberAuditEvent  # noqa: F401  — S02-06
from app.features.chambers.provider_policy import ChamberProviderPolicyVersion  # noqa: F401  — S02-07
from app.features.clients.models import Client, ClientCaseLink  # noqa: F401  — S03-01
from app.features.fees.models import FeeAgreement, FeeLedgerEntry  # noqa: F401  — S03-04
from app.features.receipts.models import MatterCustodyItem  # noqa: F401  — S03-06
from app.features.revisions.models import (  # noqa: F401  — S05-02/03
    WorkingDocument,
    WorkingDocumentRevision,
    WorkingDocumentRevisionEvent,
    EditorBootstrapSession,
)
from app.features.summaries.models import (  # noqa: F401 — S07-04/06
    SummaryProviderAttempt,
    SummaryReviewDecision,
    SummaryRun,
    SummarySourceDependency,
)
from app.features.legal_research.models import (  # noqa: F401 — Indian Kanoon foundation
    LegalAuthority,
    LegalAuthorityManifest,
    LegalAuthorityPassage,
    LegalAuthorityReview,
    LegalAuthorityVersion,
    LegalProposition,
    LegalResearchOperation,
    LegalResearchRun,
    LegalResearchResumeIntent,
)

from app.features.okf_exports.models import OkfContextSnapshot  # noqa: F401

__all__ = ["Base"]
from app.features.documents.source_models import (  # noqa: F401
    OriginalTextSource,
    ReviewedSourceProvenance,
    DocumentTypingAttempt,
)
