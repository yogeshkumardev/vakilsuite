"""Strict, source-bound schema for an unreviewed case summary."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SummarySectionName(str, Enum):
    case_identification = "case_identification"
    executive_summary = "executive_summary"
    parties_and_roles = "parties_and_roles"
    prosecution_allegations = "prosecution_allegations"
    chronology_of_events = "chronology_of_events"
    legal_provisions_mentioned = "legal_provisions_mentioned"
    witness_statements = "witness_statements"
    medical_forensic_findings = "medical_forensic_findings"
    documentary_evidence = "documentary_evidence"
    procedural_and_custody_history = "procedural_and_custody_history"
    contradictions_and_evidence_gaps = "contradictions_and_evidence_gaps"
    potential_defence_points = "potential_defence_points"
    potential_prosecution_points = "potential_prosecution_points"
    missing_information = "missing_information"
    advocate_review_checklist = "advocate_review_checklist"


class FindingType(str, Enum):
    allegation = "allegation"
    stated_fact = "stated_fact"
    finding = "finding"
    legal_provision = "legal_provision"
    witness_statement = "witness_statement"
    medical_forensic = "medical_forensic"
    documentary_evidence = "documentary_evidence"
    procedural_history = "procedural_history"
    contradiction = "contradiction"
    evidence_gap = "evidence_gap"
    potential_defence_point = "potential_defence_point"
    potential_prosecution_point = "potential_prosecution_point"
    missing_information = "missing_information"
    review_checklist = "review_checklist"


class SourceCitation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_document_id: str = Field(min_length=1)
    source_revision_id: str = Field(min_length=1)
    page_number: int | None = Field(default=None, ge=1)
    source_paths: list[str] = Field(min_length=1, max_length=50)
    page_reference_note: str = Field(default="Not available", max_length=120)
    finding_type: FindingType | None = None


class SummaryFinding(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(min_length=1, max_length=5_000)
    finding_type: FindingType
    citations: list[SourceCitation] = Field(min_length=1, max_length=25)
    confirmed: bool = False
    requires_advocate_review: bool = True

    @model_validator(mode="after")
    def citation_types_match_finding(self):
        self.confirmed = False
        self.requires_advocate_review = True
        for citation in self.citations:
            citation.finding_type = self.finding_type
        return self


class SummarySection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: SummarySectionName
    findings: list[SummaryFinding] = Field(default_factory=list, max_length=100)


class CaseSummaryPayload(BaseModel):
    """Provider output. It remains unreviewed until a lawyer accepts it."""

    model_config = ConfigDict(extra="ignore")

    output_language: str = Field(min_length=2, max_length=50)
    sections: list[SummarySection] = Field(min_length=1, max_length=15)
    uncertainties: list[str] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def section_names_are_unique(self):
        actual = [section.name for section in self.sections]
        if len(actual) != len(set(actual)):
            raise ValueError("Summary sections must not repeat")
        return self
