"""Load and resolve court formatting rules without implicit defaults."""

from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Literal

import yaml
from pydantic import ValidationError

from app.features.court_rules.schemas import CourtFile, CourtRule, FormatSpec, ResolvedRule, RulesFile


class RuleCoverageError(ValueError):
    """A required, applicable court rule has no effective source-backed value."""


def _courts_root() -> Path:
    return Path(__file__).resolve().parents[4] / "courts"


def _load_yaml(path: Path) -> object:
    try:
        with path.open("rb") as stream:
            return yaml.safe_load(stream)
    except (OSError, yaml.YAMLError) as exc:
        raise RuleCoverageError(f"Cannot load court configuration: {path}") from exc


def _load_court(court_code: str, courts_root: Path) -> tuple[CourtFile, RulesFile]:
    directory = courts_root / court_code.removesuffix("_hc").replace("_", "-")
    if court_code == "allahabad_hc":
        directory = courts_root / "allahabad"
    try:
        court = CourtFile.model_validate(_load_yaml(directory / "court.yaml"))
        rules = RulesFile.model_validate(_load_yaml(directory / "rules.yaml"))
    except ValidationError as exc:
        raise RuleCoverageError(f"Invalid court configuration for {court_code}") from exc
    if court.court_code != court_code or rules.court_code != court_code:
        raise RuleCoverageError(f"Court configuration identity mismatch for {court_code}")
    return court, rules


def _matches(rule: CourtRule, *, bench_code: str, filing_mode: str, language: str, as_of: date) -> bool:
    applies = rule.applies_to
    return (
        rule.effective_from <= as_of
        and (rule.effective_to is None or as_of <= rule.effective_to)
        and (applies.bench_code is None or applies.bench_code == bench_code)
        and (applies.filing_mode is None or applies.filing_mode == filing_mode)
        and (applies.language is None or applies.language == language)
    )


def get_format_spec(
    court_code: str,
    bench_code: str,
    as_of: date,
    filing_mode: Literal["physical", "efiling"],
    language: Literal["en", "hi", "mixed"],
    *,
    courts_root: Path | None = None,
) -> FormatSpec:
    """Resolve a complete, auditable format specification for one filing context.

    Rank 1 is strongest authority; within an equal rank, the newest effective
    rule wins. Missing required attributes always fail rather than defaulting.
    """

    court, rules_file = _load_court(court_code, courts_root or _courts_root())
    if bench_code not in {bench.code for bench in court.benches}:
        raise RuleCoverageError(f"Unknown bench {bench_code!r} for {court_code}")
    if filing_mode not in court.filing_modes:
        raise RuleCoverageError(f"Unsupported filing mode {filing_mode!r} for {court_code}")
    if language not in court.pleading_languages:
        raise RuleCoverageError(f"Unsupported pleading language {language!r} for {court_code}")

    candidates: dict[str, list[CourtRule]] = {}
    for rule in rules_file.rules:
        if _matches(rule, bench_code=bench_code, filing_mode=filing_mode, language=language, as_of=as_of):
            candidates.setdefault(rule.attribute, []).append(rule)

    selected: dict[str, ResolvedRule] = {}
    warnings: list[str] = []
    for attribute, options in candidates.items():
        ordered = sorted(options, key=lambda item: (item.authority_rank, -item.effective_from.toordinal()))
        winner = ordered[0]
        selected[attribute] = ResolvedRule(
            attribute=winner.attribute,
            value=winner.value,
            rule_class=winner.rule_class,
            authority_rank=winner.authority_rank,
            effective_from=winner.effective_from,
            effective_to=winner.effective_to,
            source=winner.source,
            status=winner.status,
        )
        if winner.status == "needs_verification":
            warnings.append(f"{attribute}: court verification is pending ({winner.source.locator})")
        if any(option.value != winner.value for option in ordered[1:]):
            warnings.append(f"{attribute}: conflicting effective rules resolved by authority rank and date")

    required = (*court.required_attributes.common, *getattr(court.required_attributes, filing_mode))
    missing = sorted(attribute for attribute in required if attribute not in selected)
    if missing:
        raise RuleCoverageError(
            f"Missing required rules for {court_code}/{bench_code}/{filing_mode} on {as_of.isoformat()}: "
            + ", ".join(missing)
        )

    return FormatSpec(
        court_code=court_code,
        bench_code=bench_code,
        as_of=as_of,
        filing_mode=filing_mode,
        language=language,
        rules=selected,
        warnings=tuple(warnings),
    )
