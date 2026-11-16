"""Validated contracts for court YAML configuration."""

from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SourceReference(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str = Field(min_length=1)
    file: str = Field(min_length=1)
    locator: str = Field(min_length=1)


class RuleApplicability(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    bench_code: str | None = None
    filing_mode: Literal["physical", "efiling"] | None = None
    language: Literal["en", "hi", "mixed"] | None = None


class CourtRule(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True, populate_by_name=True)

    attribute: str = Field(pattern=r"^[a-z][a-z0-9_.-]+$")
    value: Any
    rule_class: Literal["mandatory", "bounded", "style"] = Field(alias="class")
    authority_rank: int = Field(ge=1, le=100)
    effective_from: date
    effective_to: date | None = None
    applies_to: RuleApplicability = Field(default_factory=RuleApplicability)
    source: SourceReference
    status: Literal["verified", "needs_verification"]

    @model_validator(mode="after")
    def validate_effective_range(self) -> "CourtRule":
        if self.effective_to and self.effective_to < self.effective_from:
            raise ValueError("effective_to must not precede effective_from")
        return self


class RulesFile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    court_code: str = Field(pattern=r"^[a-z][a-z0-9_]+$")
    rules: tuple[CourtRule, ...] = Field(min_length=1)


class Bench(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    code: str = Field(pattern=r"^[a-z][a-z0-9_]+$")
    name: str = Field(min_length=1)


class RequiredAttributes(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    common: tuple[str, ...] = Field(min_length=1)
    physical: tuple[str, ...] = Field(min_length=1)
    efiling: tuple[str, ...] = Field(min_length=1)


class CourtFile(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    court_code: str = Field(pattern=r"^[a-z][a-z0-9_]+$")
    name: str = Field(min_length=1)
    country: str = Field(pattern=r"^[A-Z]{2}$")
    benches: tuple[Bench, ...] = Field(min_length=1)
    filing_modes: tuple[Literal["physical", "efiling"], ...]
    pleading_languages: tuple[Literal["en", "hi", "mixed"], ...]
    required_attributes: RequiredAttributes

    @model_validator(mode="after")
    def validate_unique_benches(self) -> "CourtFile":
        if len({bench.code for bench in self.benches}) != len(self.benches):
            raise ValueError("bench codes must be unique")
        return self


class ResolvedRule(BaseModel):
    model_config = ConfigDict(frozen=True)

    attribute: str
    value: Any
    rule_class: Literal["mandatory", "bounded", "style"]
    authority_rank: int
    effective_from: date
    effective_to: date | None
    source: SourceReference
    status: Literal["verified", "needs_verification"]


class FormatSpec(BaseModel):
    model_config = ConfigDict(frozen=True)

    court_code: str
    bench_code: str
    as_of: date
    filing_mode: Literal["physical", "efiling"]
    language: Literal["en", "hi", "mixed"]
    rules: dict[str, ResolvedRule]
    warnings: tuple[str, ...]

    def value_for(self, attribute: str) -> Any:
        return self.rules[attribute].value

    def font_for(self, script: Literal["latin", "devanagari"]) -> dict[str, Any]:
        return self.value_for("font.english" if script == "latin" else "font.hindi")

    @property
    def bold_roles(self) -> list[str]:
        return list(self.value_for("bold.roles"))

    @property
    def italic_roles(self) -> list[str]:
        return list(self.value_for("italic.roles"))
