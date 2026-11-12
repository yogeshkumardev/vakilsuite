"""Strict local contracts for the S01 synthetic Open Knowledge Format bundle."""

from __future__ import annotations

from pathlib import PurePosixPath

from pydantic import BaseModel, ConfigDict, Field, field_validator


class BundleEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{2,79}$")
    path: str = Field(min_length=3, max_length=240)
    kind: str = Field(pattern=r"^(source|template|annexure)$")
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")

    @field_validator("path")
    @classmethod
    def validate_relative_path(cls, value: str) -> str:
        path = PurePosixPath(value)
        if path.is_absolute() or ".." in path.parts or path.suffix != ".md":
            raise ValueError("path must be a safe relative Markdown path")
        return value


class BundleManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    format: str = Field(pattern=r"^vakilsuite-okf-bundle/v1$")
    bundle_id: str = Field(pattern=r"^[a-z0-9][a-z0-9_-]{2,79}$")
    version: str = Field(pattern=r"^\d+\.\d+\.\d+$")
    okf_spec_version: str = Field(pattern=r"^0\.2$")
    okf_spec_commit: str = Field(pattern=r"^[a-f0-9]{40}$")
    okf_spec_url: str = Field(pattern=r"^https://")
    entries: tuple[BundleEntry, ...] = Field(min_length=3)

    @field_validator("entries")
    @classmethod
    def validate_entry_set(cls, entries: tuple[BundleEntry, ...]) -> tuple[BundleEntry, ...]:
        if len({entry.id for entry in entries}) != len(entries):
            raise ValueError("entry IDs must be unique")
        if len({entry.path for entry in entries}) != len(entries):
            raise ValueError("entry paths must be unique")
        kinds = {entry.kind for entry in entries}
        if not {"source", "template", "annexure"}.issubset(kinds):
            raise ValueError("bundle must include source, template, and annexure entries")
        return entries


class VerifiedBundleEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    id: str
    path: str
    kind: str
    sha256: str
    frontmatter: dict


class VerifiedBundle(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    bundle_id: str
    version: str
    manifest_sha256: str
    okf_spec_version: str
    okf_spec_commit: str
    entries: tuple[VerifiedBundleEntry, ...]
