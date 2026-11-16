"""Load court blueprints from YAML; no court wording lives in Python."""

from pathlib import Path
from typing import Literal

import yaml
from pydantic import ValidationError

from app.features.blueprints.schemas import Blueprint


class BlueprintCoverageError(ValueError):
    pass


def _root() -> Path:
    return Path(__file__).resolve().parents[4] / "courts"


def get_blueprint(
    draft_type: str,
    court_code: str,
    bench_code: str,
    filing_mode: Literal["physical", "efiling"],
    language: Literal["en", "hi", "mixed"],
    *,
    courts_root: Path | None = None,
) -> Blueprint:
    root = courts_root or _root()
    candidates: list[Blueprint] = []
    for path in root.glob("*/blueprints/*.yaml"):
        try:
            blueprint = Blueprint.model_validate(yaml.safe_load(path.read_bytes()))
        except (OSError, yaml.YAMLError, ValidationError) as exc:
            raise BlueprintCoverageError(f"Invalid blueprint configuration: {path}") from exc
        applies = blueprint.applies_to
        if (
            blueprint.draft_type == draft_type
            and applies.court_code == court_code
            and bench_code in applies.bench_codes
            and filing_mode in applies.filing_modes
            and language in applies.pleading_languages
        ):
            candidates.append(blueprint)
    if len(candidates) != 1:
        raise BlueprintCoverageError(
            f"Expected exactly one blueprint for {court_code}/{bench_code}/{draft_type}; found {len(candidates)}"
        )
    return candidates[0]
