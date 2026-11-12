"""Provider-free S528 input coverage. Reference validity is not legal verification."""
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.core.exceptions import ConflictError, ValidationError


class DraftField(str, Enum):
    parties = "parties"
    case_identification = "case_identification"
    impugned_order = "impugned_order"
    procedural_history = "procedural_history"
    material_facts = "material_facts"


class DraftPreflightRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    fact_bindings: dict[DraftField, list[str]] = Field(default_factory=dict, max_length=5)


class DraftPreflightResponse(BaseModel):
    contract_version: str = "s528-input-coverage/v1"
    context_sha256: str
    required_fields: list[DraftField]
    missing_fields: list[DraftField]
    bound_fact_ids: dict[DraftField, list[str]]
    reference_coverage_complete: bool
    generation_available: bool = False
    warnings: list[str]


def check_draft_inputs(payload: dict, context_hash: str,
                       body: DraftPreflightRequest) -> DraftPreflightResponse:
    if context_hash != body.expected_manifest_sha256:
        raise ConflictError("Context changed; reload before checking draft inputs")
    application = payload.get("application", {})
    template = application.get("template", {})
    if template.get("bundle_id") not in {"s528_curated_01", "s528_curated_02", "s528_curated_03"}:
        raise ValidationError("Draft input checking supports the approved S528 variants only")
    facts = {fact["id"]: fact for fact in application.get("confirmed_facts", [])}
    bindings = {}
    for field, ids in body.fact_bindings.items():
        if len(ids) > 20 or len(ids) != len(set(ids)):
            raise ValidationError("Each field accepts at most 20 distinct confirmed facts")
        for ident in ids:
            fact = facts.get(ident)
            if not fact or not fact.get("citations"):
                raise ValidationError("Each binding must reference a cited confirmed fact in this context")
            if not str(fact.get("text", "")).strip() or str(fact["text"]).strip().casefold() == "not available":
                raise ValidationError("Unavailable information cannot satisfy a required field")
        bindings[field] = ids
    missing = [field for field in DraftField if not bindings.get(field)]
    return DraftPreflightResponse(context_sha256=context_hash, required_fields=list(DraftField),
        missing_fields=missing, bound_fact_ids=bindings,
        reference_coverage_complete=not missing,
        warnings=["Bindings are user selections; reference coverage does not verify factual meaning or legal sufficiency.",
                  "Relief, grounds, affidavit capacity and verification require advocate review.",
                  ("Reviewed authority context is attached; Generation requires a separate cost estimate and explicit submission."
                   if application.get("verified_authorities") else
                   "No reviewed authority context is attached; Generation requires a separate cost estimate and explicit submission.")])
