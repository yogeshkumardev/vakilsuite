import hashlib
import json
from pathlib import Path

import pytest

from app.features.knowledge_bundles.s528_testing import prepare_test_context


@pytest.fixture
def batch(tmp_path):
    original = Path(__file__).resolve().parents[2] / "okf_bundles/s01_synthetic_legal"
    manifest = json.loads((original / "BUNDLE_MANIFEST.json").read_text())
    manifest["bundle_id"] = "s528_curated_01"
    bundle = tmp_path / "S528_01/okf_candidate"
    chunks = []
    for entry in manifest["entries"]:
        text = (original / entry["path"]).read_text().replace("status: stable", "status: draft")
        path = bundle / entry["path"]
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)
        entry["sha256"] = hashlib.sha256(text.encode()).hexdigest()
        body = text.split("\n---\n", 1)[1].strip()
        chunks.append(dict(id=entry["id"], sample_id="S528_01", text=body,
                           sha256=hashlib.sha256(body.encode()).hexdigest(),
                           source_docx_sha256="a" * 64, source_info_sha256="b" * 64,
                           derived_path=f'S528_01/okf_candidate/{entry["path"]}',
                           approved=False, indexable=False, authority=False, case_evidence=False))
    (bundle / "BUNDLE_MANIFEST.json").write_text(json.dumps(manifest))
    (tmp_path / "S528_01/provenance.json").write_text(json.dumps({
        "input_docx_sha256": "a" * 64, "input_info_sha256": "b" * 64}))
    (tmp_path / "rag_candidates.jsonl").write_text("\n".join(map(json.dumps, chunks)))
    return tmp_path


def test_no_sample_evidence_or_implicit_promotion(batch):
    result = prepare_test_context(batch, sample_id="S528_01")
    assert result["case_facts"] == result["verified_authorities"] == []
    assert not result["production_eligible"]
    assert len(result["guidance"]) == 3


def test_changed_template_rejected(batch):
    path = batch / "S528_01/okf_candidate/templates/bail-application.md"
    path.write_text(path.read_text() + "changed")
    with pytest.raises(ValueError, match="hash mismatch"):
        prepare_test_context(batch, sample_id="S528_01")


@pytest.mark.parametrize("change", ["authority", "source", "projection"])
def test_changed_chunk_boundary_rejected(batch, change):
    path = batch / "rag_candidates.jsonl"
    chunks = [json.loads(line) for line in path.read_text().splitlines()]
    if change == "authority":
        chunks[0]["authority"] = True
    elif change == "source":
        chunks[0]["source_docx_sha256"] = "c" * 64
    else:
        chunks[0]["text"] = "Unrelated sample fact"
        chunks[0]["sha256"] = hashlib.sha256(chunks[0]["text"].encode()).hexdigest()
    path.write_text("\n".join(map(json.dumps, chunks)))
    with pytest.raises(ValueError):
        prepare_test_context(batch, sample_id="S528_01")


def test_other_category_rejected(batch):
    with pytest.raises(ValueError, match="Only"):
        prepare_test_context(batch, sample_id="BAIL_01")


def test_reviewed_release_loads_in_real_catalog(batch):
    from app.features.knowledge_bundles.release import release_template, review_snapshot
    from app.features.okf_exports.service import OkfBundleCatalog

    snapshot = review_snapshot(batch, "S528_01")
    releases = batch / "releases"
    args = dict(sample_id="S528_01", expected_review_sha256=snapshot["review_sha256"],
                reviewer="test-reviewer", confirm_review=True)
    target = release_template(batch, releases, **args)
    assert (target / "APPROVAL.json").is_file()
    catalog = OkfBundleCatalog(releases)
    assert len(catalog.templates()) == 1
    assert catalog.templates()[0].bundle_version == "1.0.0"
    assert not prepare_test_context(batch, sample_id="S528_01")["production_eligible"]
    with pytest.raises(FileExistsError):
        release_template(batch, releases, **args)


def test_release_requires_exact_review_and_confirmation(batch):
    from app.features.knowledge_bundles.release import release_template, review_snapshot

    digest = review_snapshot(batch, "S528_01")["review_sha256"]
    for confirmed, expected in [(False, digest), (True, "0" * 64)]:
        with pytest.raises(ValueError):
            release_template(batch, batch / "releases", sample_id="S528_01",
                             expected_review_sha256=expected, reviewer="test-reviewer",
                             confirm_review=confirmed)
