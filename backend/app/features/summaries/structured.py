"""Versioned source-grounded summary contract; rendering order is server-owned."""

from __future__ import annotations

from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic_core import PydanticCustomError

SCHEMA_VERSION = "case-summary-v2"
PROMPT_VERSION = "allahabad-criminal-summary-v5"


class UnverifiedSummary(BaseModel):
    """Preserve a billed provider response without granting it approval authority."""

    schema_version: Literal["case-summary-unverified-v1"] = "case-summary-unverified-v1"
    raw_text: str = Field(min_length=1)
    reason: Literal["invalid_format", "incomplete_output", "failed_validation"]
SECTION_TITLES = {
    "case_overview": "Case Overview",
    "executive_summary": "Executive Summary",
    "chronological_timeline": "Chronological Timeline of Events",
    "parties_and_roles": "Parties & Their Roles",
    "prosecution_version": "Prosecution / Complainant Version",
    "applicant_version": "Applicant / Accused Version",
    "witness_analysis": "Witness Analysis",
    "evidence_analysis": "Evidence Analysis",
    "contradictions": "Contradictions & Inconsistencies",
    "legal_provisions": "Applicable Legal Provisions",
    "legal_issues": "Legal Issues for Consideration",
    "defence_grounds": "Potential Defence Grounds",
    "prosecution_arguments": "Prosecution's Possible Arguments",
    "missing_information": "Missing Information & Documents",
    "advocate_actions": "Advocate Action Points",
}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CitationV2(StrictModel):
    document_id: str = Field(min_length=1, max_length=80)
    file_version_id: str = Field(min_length=1, max_length=80)
    source_revision_id: str = Field(min_length=1, max_length=80)
    page_number: int = Field(ge=1, le=500)
    source_paths: list[str] = Field(min_length=1, max_length=50)


class Fact(StrictModel):
    id: str = Field(pattern=r"^[a-zA-Z][a-zA-Z0-9_-]{0,79}$")
    text: str = Field(min_length=1, max_length=5000)
    status: Literal[
        "alleged",
        "documented",
        "disputed",
        "unclear",
        "applicant_statement",
        "judicial_finding",
        "record_provision",
    ]
    citations: list[CitationV2] = Field(min_length=1, max_length=25)


class Analysis(StrictModel):
    text: str = Field(min_length=1, max_length=5000)
    basis_fact_ids: list[str] = Field(min_length=1, max_length=50)
    verification: Literal["requires_verification"] = "requires_verification"


class FactGroup(StrictModel):
    availability: Literal["available", "not_available", "not_applicable", "unreadable"]
    findings: list[Fact] = Field(max_length=100)

    @model_validator(mode="after")
    def availability_matches(self):
        if (self.availability == "available") != bool(self.findings):
            raise PydanticCustomError(
                "summary_availability",
                "Available groups require facts; unavailable groups cannot invent them"
            )
        return self


class Overview(StrictModel):
    case_title: FactGroup
    case_numbers: FactGroup
    court_and_bench: FactGroup
    petitioner_applicant_accused: FactGroup
    complainant_opposite_party: FactGroup
    fir_number_and_police_station: FactGroup
    applicable_provisions: FactGroup
    current_case_stage: FactGroup
    relief_sought: FactGroup


class ExecutiveSummary(StrictModel):
    sentences: list[Fact] = Field(min_length=1, max_length=30)

    @model_validator(mode="after")
    def word_count(self):
        count = len(" ".join(f.text for f in self.sentences).split())
        if not 150 <= count <= 250:
            raise PydanticCustomError(
                "summary_executive_word_count",
                "Executive summary must contain 150–250 words, excluding citation labels"
            )
        return self


class EventDate(StrictModel):
    source_wording: str = Field(min_length=1, max_length=300)
    normalized_date: str | None = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    time: str | None = Field(max_length=80)
    precision: Literal["exact", "range", "month", "year", "relative", "unknown"]

    @model_validator(mode="after")
    def no_guessed_dates(self):
        if self.normalized_date:
            from datetime import date

            date.fromisoformat(self.normalized_date)
            if self.precision != "exact":
                raise PydanticCustomError("summary_date_precision", "Uncertain dates cannot be sorted as exact dates")
        if self.precision == "unknown" and self.time is not None:
            raise PydanticCustomError("summary_unknown_time", "Unknown dates cannot invent times")
        return self


class TimelineEvent(StrictModel):
    event_id: str = Field(min_length=1, max_length=80)
    date_time: EventDate
    event: Fact
    persons_involved: FactGroup
    event_status: Literal["alleged", "documented", "disputed", "unclear"]
    legal_significance: Analysis | None
    conflict_id: str | None = Field(max_length=80)


class Timelines(StrictModel):
    incident_factual: list[TimelineEvent] = Field(max_length=200)
    procedural_court: list[TimelineEvent] = Field(max_length=200)


class Party(StrictModel):
    identity_and_role: Fact
    relationship: FactGroup
    alleged_involvement: FactGroup


class Parties(StrictModel):
    parties: list[Party] = Field(max_length=100)


class Witness(StrictModel):
    identity_and_role: Fact
    statements: FactGroup
    assertions: FactGroup
    inconsistencies: list[Analysis] = Field(max_length=50)


class Witnesses(StrictModel):
    witnesses: list[Witness] = Field(max_length=100)


class MatrixRow(StrictModel):
    allegation_fact_id: str
    supporting_fact_ids: list[str] = Field(max_length=50)
    defence_fact_ids: list[str] = Field(max_length=50)
    defence_observation: Analysis | None
    research_required: str = Field(min_length=1, max_length=1500)


class Evidence(StrictModel):
    materials: FactGroup
    observations: list[Analysis] = Field(max_length=100)
    allegation_evidence_defence_matrix: list[MatrixRow] = Field(max_length=100)


class Contradiction(StrictModel):
    competing_fact_ids: list[str] = Field(min_length=2, max_length=25)
    observation: Analysis
    resolution: Literal["unresolved"] = "unresolved"


class Contradictions(StrictModel):
    conflicts: list[Contradiction] = Field(max_length=100)


class Provisions(StrictModel):
    record_mentioned: FactGroup
    ai_suggested: list[Analysis] = Field(max_length=100)


class Analyses(StrictModel):
    observations: list[Analysis] = Field(max_length=100)


class MissingItem(StrictModel):
    description: str = Field(min_length=1, max_length=2000)
    related_fact_ids: list[str] = Field(max_length=50)
    availability: Literal["not_supplied", "unreadable", "needs_verification"]


class MissingInformation(StrictModel):
    items: list[MissingItem] = Field(max_length=100)


class AdvocateAction(StrictModel):
    category: Literal[
        "obtain_documents",
        "research_judgments",
        "verify_grounds",
        "finalize_annexures",
        "drafting_next_steps",
    ]
    instruction: str = Field(min_length=1, max_length=2000)
    related_fact_ids: list[str] = Field(max_length=50)


class Actions(StrictModel):
    actions: list[AdvocateAction] = Field(max_length=100)


class SectionsV2(StrictModel):
    case_overview: Overview
    executive_summary: ExecutiveSummary
    chronological_timeline: Timelines
    parties_and_roles: Parties
    prosecution_version: FactGroup
    applicant_version: FactGroup
    witness_analysis: Witnesses
    evidence_analysis: Evidence
    contradictions: Contradictions
    legal_provisions: Provisions
    legal_issues: Analyses
    defence_grounds: Analyses
    prosecution_arguments: Analyses
    missing_information: MissingInformation
    advocate_actions: Actions


def walk_models(value):
    if isinstance(value, BaseModel):
        yield value
        for field in type(value).model_fields:
            yield from walk_models(getattr(value, field))
    elif isinstance(value, list):
        for item in value:
            yield from walk_models(item)


class StructuredSummary(StrictModel):
    schema_version: Literal["case-summary-v2"] = SCHEMA_VERSION
    output_language: str = Field(min_length=2, max_length=50)
    sections: SectionsV2
    uncertainties: list[str] = Field(max_length=200)
    additional_sections: dict[str, Any] = Field(
        default_factory=dict,
        description="Extra sections generated by the AI that are outside the defined schema. Preserved for advocate review.",
    )

    @model_validator(mode="after")
    def references_are_grounded(self):
        facts = list(self.facts())
        ids = {f.id for f in facts}
        if len(facts) != len(ids):
            raise PydanticCustomError("summary_duplicate_fact_id", "Every factual finding ID must be unique")
        for obj in walk_models(self.sections):
            refs = []
            if isinstance(obj, Analysis):
                refs = obj.basis_fact_ids
            elif isinstance(obj, MatrixRow):
                refs = [
                    obj.allegation_fact_id,
                    *obj.supporting_fact_ids,
                    *obj.defence_fact_ids,
                ]
            elif isinstance(obj, Contradiction):
                refs = obj.competing_fact_ids
                if len(set(refs)) < 2:
                    raise PydanticCustomError(
                        "summary_contradiction_references",
                        "Contradictions require two different sourced assertions"
                    )
            elif isinstance(obj, (MissingItem, AdvocateAction)):
                refs = obj.related_fact_ids
            if not set(refs) <= ids:
                raise PydanticCustomError("summary_unresolved_reference", "Unresolved factual reference")
        by_id = {f.id: f for f in facts}
        for row in self.sections.evidence_analysis.allegation_evidence_defence_matrix:
            if by_id[row.allegation_fact_id].status not in {"alleged", "disputed"}:
                raise PydanticCustomError("summary_allegation_status", "Matrix allegation must retain allegation status")
            if any(
                by_id[i].status != "applicant_statement" for i in row.defence_fact_ids
            ):
                raise PydanticCustomError(
                    "summary_defence_status",
                    "Actual defence account must be an applicant statement"
                )
        for f in self.sections.applicant_version.findings:
            if f.status != "applicant_statement":
                raise PydanticCustomError("summary_applicant_status", "Applicant version cannot contain inferred defence")
        for f in self.sections.legal_provisions.record_mentioned.findings:
            if f.status != "record_provision":
                raise PydanticCustomError("summary_provision_status", "Record provisions must be labelled record_provision")
        events = {}
        for e in [
            *self.sections.chronological_timeline.incident_factual,
            *self.sections.chronological_timeline.procedural_court,
        ]:
            if e.event.status != e.event_status:
                raise PydanticCustomError("summary_event_status", "Timeline event status must match the source finding")
            fingerprint = (
                e.date_time.model_dump(),
                e.event.text,
                e.event_status,
                [c.model_dump() for c in e.event.citations],
                [
                    (p.text, p.status, [c.model_dump() for c in p.citations])
                    for p in e.persons_involved.findings
                ],
            )
            if e.event_id in events and events[e.event_id] != fingerprint:
                raise PydanticCustomError(
                    "summary_event_conflict",
                    "Shared timeline events must preserve the same account"
                )
            events[e.event_id] = fingerprint
        return self

    def facts(self):
        return (obj for obj in walk_models(self.sections) if isinstance(obj, Fact))

    def canonicalize(self):
        """Assign deterministic server-owned IDs and sort exact dates only."""
        mapping = {f.id: f"fact_{i:04d}" for i, f in enumerate(self.facts(), 1)}
        for obj in walk_models(self.sections):
            if isinstance(obj, Fact):
                obj.id = mapping[obj.id]
            for attr in (
                "basis_fact_ids",
                "supporting_fact_ids",
                "defence_fact_ids",
                "competing_fact_ids",
                "related_fact_ids",
            ):
                if hasattr(obj, attr):
                    setattr(obj, attr, [mapping[x] for x in getattr(obj, attr)])
            if isinstance(obj, MatrixRow):
                obj.allegation_fact_id = mapping[obj.allegation_fact_id]
        for entries in (
            self.sections.chronological_timeline.incident_factual,
            self.sections.chronological_timeline.procedural_court,
        ):
            entries.sort(
                key=lambda e: (
                    e.date_time.normalized_date is None,
                    e.date_time.normalized_date or "",
                )
            )
        return self
