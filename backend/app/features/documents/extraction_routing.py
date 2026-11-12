"""Pure, paid-call-free extraction route selection for S06."""
from dataclasses import dataclass
from app.features.documents.models import DocumentContentClassification
from app.features.chambers.schemas import ChamberProviderPolicyIn, ProviderOperation

@dataclass(frozen=True)
class ExtractionRoute:
    mode: str
    providers: tuple[tuple[str, str], ...]
    policy_version: int

def select_extraction_route(*, classification: DocumentContentClassification, policy: ChamberProviderPolicyIn, policy_version: int) -> ExtractionRoute | None:
    if not policy.external_processing_allowed or not policy.capabilities.indexing:
        return None
    task = next((item for item in policy.task_policies if item.operation == ProviderOperation.transcription), None)
    if task is None:
        return None
    mode = {DocumentContentClassification.digital: "digital_extract", DocumentContentClassification.scanned: "vision_transcribe", DocumentContentClassification.mixed: "hybrid_extract"}.get(classification)
    if mode is None:
        return None
    return ExtractionRoute(mode=mode, providers=tuple((route.provider, route.model) for route in task.providers), policy_version=policy_version)
