from app.features.documents.extraction_mapping import build_attempt_provenance, map_extraction_to_lexical
from app.features.documents.extraction_validation import ExtractionOutput

def test_mapping_preserves_page_and_uncertainty_labels():
    output = ExtractionOutput(source_file_version_id="v", source_sha256="a" * 64, completed_pages=[1], blocks=[{"page_number": 1, "text": "unclear name", "uncertain": True}])
    mapped = map_extraction_to_lexical(output)
    text = mapped["editorState"]["root"]["children"][1]["children"][0]["text"]
    assert text == "[Uncertain] unclear name"
    assert mapped["schemaVersion"] == 1

def test_provenance_hashes_output_without_storing_raw_text():
    output = ExtractionOutput(source_file_version_id="v", source_sha256="a" * 64, completed_pages=[1], blocks=[{"page_number": 1, "text": "secret text", "uncertain": False}])
    provenance = build_attempt_provenance(output, provider="gemini", model="test", manifest_digest="b" * 64)
    assert provenance.output_sha256 and not hasattr(provenance, "raw_output")
