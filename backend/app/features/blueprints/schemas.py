"""Validated, source-cited declarative court-draft blueprints."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BlueprintSource(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    title: str = Field(min_length=1)
    locator: str = Field(min_length=1)
    note: str = Field(min_length=1)


class Applicability(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    court_code: str
    bench_codes: tuple[str, ...] = Field(min_length=1)
    filing_modes: tuple[Literal["physical", "efiling"], ...] = Field(min_length=1)
    pleading_languages: tuple[Literal["en", "hi", "mixed"], ...] = Field(min_length=1)


class Tier(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    current: Literal["A", "B", "C"]
    banner: str = Field(min_length=1)


class Variant(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    when: str = Field(min_length=1)
    opening: str = Field(min_length=1)


class LlmBlock(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    name: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    role: Literal["body", "prayer", "extract", "statute_ref", "court_ref"]


class Component(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    code: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    mode: Literal["template", "table", "hybrid", "repeat"]
    required: bool
    role: Literal["body", "prayer", "extract", "statute_ref", "court_ref"]
    repeat_for: str | None = None
    template: str | None = None
    columns: tuple[str, ...] = ()
    fixed_blocks: tuple[str, ...] = ()
    llm_blocks: tuple[LlmBlock, ...] = ()
    variants: dict[str, Variant] = {}

    @model_validator(mode="after")
    def validate_shape(self) -> "Component":
        if self.mode == "table" and not self.columns:
            raise ValueError("table component needs columns")
        if self.mode in {"template", "repeat"} and not self.template:
            raise ValueError("template/repeat component needs template")
        if self.mode == "repeat" and not self.repeat_for:
            raise ValueError("repeat component needs repeat_for")
        return self


class Blueprint(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    blueprint_code: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    version: int = Field(ge=1)
    status: Literal["approved", "needs_advocate_review"]
    source: BlueprintSource
    applies_to: Applicability
    draft_type: str = Field(pattern=r"^[a-z][a-z0-9_]*$")
    tiers: Tier
    required_inputs: dict[str, tuple[str, ...]]
    components: tuple[Component, ...] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_components(self) -> "Blueprint":
        codes = [component.code for component in self.components]
        if len(codes) != len(set(codes)):
            raise ValueError("component codes must be unique")
        return self
