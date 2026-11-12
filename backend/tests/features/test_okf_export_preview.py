from __future__ import annotations

import hashlib
import json

import pytest

from app.core.exceptions import ValidationError
from app.features.okf_exports.schemas import ConfirmedFindingSelection
from app.features.okf_exports.service import OkfBundleCatalog, OkfExportPreviewService
from app.features.summaries.contracts import (
    CaseSummaryPayload,
    FindingType,
    SourceCitation,
    SummaryFinding,
    SummarySection,
    SummarySectionName,
)


def _payload() -> CaseSummaryPayload:
    return CaseSummaryPayload(
        output_language="en-IN",
        sections=[
            SummarySection(
                name=name,
                findings=[
                    SummaryFinding(
                        text=f"Confirmed {name.value}",
                        finding_type=FindingType.stated_fact,
                        citations=[
                            SourceCitation(
                                source_document_id="document-1",
                                source_revision_id="revision-1",
                                source_paths=["editorState.root.children.0"],
                                finding_type=FindingType.stated_fact,
                            )
                        ],
                    )
                ],
            )
            for name in SummarySectionName
        ],
    )


def _write_bundle(tmp_path, *, bundle_id: str = "production-bail"):
    root = tmp_path / bundle_id
    (root / "templates").mkdir(parents=True)
    template_content = (
        "---\n"
        "type: legal-template\n"
        "id: bail-template\n"
        "title: Bail application\n"
        "status: stable\n"
        "---\n"
        "# Template\n"
    ).encode()
    source_content = b"---\ntype: approved-source\nid: source-file\nstatus: stable\n---\n# Source\n"
    annexure_content = b"---\ntype: annexure-index\nid: annexure-file\nstatus: stable\n---\n# Annexure\n"
    (root / "templates" / "bail.md").write_bytes(template_content)
    (root / "sources").mkdir()
    (root / "sources" / "facts.md").write_bytes(source_content)
    (root / "annexures").mkdir()
    (root / "annexures" / "index.md").write_bytes(annexure_content)
    manifest = {
        "format": "vakilsuite-okf-bundle/v1",
        "bundle_id": bundle_id,
        "version": "1.0.0",
        "okf_spec_version": "0.2",
        "okf_spec_commit": "62432a095456147ee71e70ac6e4dc0d2dea3ac30",
        "okf_spec_url": "https://example.test/okf",
        "entries": [
            {
                "id": "bail-template",
                "path": "templates/bail.md",
                "kind": "template",
                "sha256": hashlib.sha256(template_content).hexdigest(),
            },
            {
                "id": "source-file",
                "path": "sources/facts.md",
                "kind": "source",
                "sha256": hashlib.sha256(source_content).hexdigest(),
            },
            {
                "id": "annexure-file",
                "path": "annexures/index.md",
                "kind": "annexure",
                "sha256": hashlib.sha256(annexure_content).hexdigest(),
            },
        ],
    }
    (root / "BUNDLE_MANIFEST.json").write_text(json.dumps(manifest), encoding="utf-8")
    return root


def test_confirmed_facts_are_source_bound_and_sorted() -> None:
    facts = OkfExportPreviewService._confirmed_facts(
        _payload(),
        [
            ConfirmedFindingSelection(section=SummarySectionName.executive_summary, finding_index=0),
            ConfirmedFindingSelection(section=SummarySectionName.case_identification, finding_index=0),
        ],
    )

    assert [fact["section"] for fact in facts] == ["case_identification", "executive_summary"]
    assert facts[0]["citations"][0]["source_revision_id"] == "revision-1"


def test_confirmed_fact_rejects_duplicates_and_missing_findings() -> None:
    payload = _payload()
    with pytest.raises(ValidationError, match="only once"):
        OkfExportPreviewService._confirmed_facts(
            payload,
            [
                ConfirmedFindingSelection(section=SummarySectionName.case_identification, finding_index=0),
                ConfirmedFindingSelection(section=SummarySectionName.case_identification, finding_index=0),
            ],
        )
    with pytest.raises(ValidationError, match="no longer exists"):
        OkfExportPreviewService._confirmed_facts(
            payload,
            [ConfirmedFindingSelection(section=SummarySectionName.case_identification, finding_index=1)],
        )


def test_catalog_never_exposes_the_synthetic_fixture(tmp_path) -> None:
    root = _write_bundle(tmp_path, bundle_id="s01_fixture")
    assert OkfBundleCatalog(root).templates() == []


def test_context_pins_actual_template_content(tmp_path):
    root = _write_bundle(tmp_path)
    catalog = OkfBundleCatalog(root)
    snapshot = catalog.capture_template(bundle_id="production-bail", bundle_version="1.0.0",
                                        template_entry_id="bail-template")
    assert len(snapshot["entries"]) == 3
    assert snapshot["case_evidence"] is False
    for entry in snapshot["entries"]:
        assert hashlib.sha256(entry["content"].encode()).hexdigest() == entry["sha256"]
    (root / "templates/bail.md").write_text("modified")
    with pytest.raises(ValidationError):
        catalog.capture_template(bundle_id="production-bail", bundle_version="1.0.0",
                                 template_entry_id="bail-template")
    assert snapshot["entries"][0]["content"].endswith("# Template\n")


def test_duplicate_bundle_identity_is_not_selected(tmp_path):
    import shutil
    root = _write_bundle(tmp_path)
    shutil.copytree(root, tmp_path / "duplicate")
    with pytest.raises(ValidationError, match="snapshot"):
        OkfBundleCatalog(tmp_path).capture_template(bundle_id="production-bail",
            bundle_version="1.0.0", template_entry_id="bail-template")


def test_oversize_knowledge_rejected(tmp_path):
    root = _write_bundle(tmp_path)
    (root / "templates/bail.md").write_bytes(b"x" * 256_001)
    with pytest.raises(ValidationError):
        OkfBundleCatalog(root).templates()
