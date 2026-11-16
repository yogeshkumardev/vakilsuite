from pathlib import Path

import pytest

from app.features.blueprints import BlueprintCoverageError, get_blueprint


def test_regular_bail_blueprint_is_declarative_and_has_affidavit_variants() -> None:
    blueprint = get_blueprint(
        "regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en"
    )
    affidavit = next(component for component in blueprint.components if component.code == "affidavit")
    application = next(component for component in blueprint.components if component.code == "application")
    assert blueprint.status == "approved"
    assert blueprint.version == 5
    assert affidavit.mode == "repeat"
    assert affidavit.repeat_for == "deponents"
    assert set(affidavit.variants) == {"applicant", "representative"}
    assert "[[relationship_to_applicant]]" in affidavit.variants["representative"].opening
    # v5: application body and prayer are deterministic boilerplate
    assert len(application.llm_blocks) == 0
    # advocate footer and header components exist
    assert any(c.code == "index_advocate_footer" for c in blueprint.components)
    assert any(c.code == "application_advocate_footer" for c in blueprint.components)
    assert any(c.code == "index_header" for c in blueprint.components)
    assert any(c.code == "annexure_paper" for c in blueprint.components)


def test_blueprint_rejects_unsupported_context() -> None:
    with pytest.raises(BlueprintCoverageError, match="found 0"):
        get_blueprint("regular_bail_483_bnss", "allahabad_hc", "lucknow", "efiling", "hi")
    with pytest.raises(BlueprintCoverageError, match="found 0"):
        get_blueprint("regular_bail_483_bnss", "allahabad_hc", "lucknow", "physical", "en")


def test_blueprint_loader_rejects_invalid_yaml(tmp_path: Path) -> None:
    path = tmp_path / "bad" / "blueprints"
    path.mkdir(parents=True)
    (path / "bad.yaml").write_text("blueprint_code: nope")
    with pytest.raises(BlueprintCoverageError, match="Invalid blueprint"):
        get_blueprint("x", "allahabad_hc", "allahabad", "efiling", "en", courts_root=tmp_path)
