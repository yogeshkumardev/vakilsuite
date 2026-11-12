import uuid
from app.features.summaries.identity import summary_cache_key

def test_summary_cache_key_is_case_and_policy_scoped():
    chamber, case = uuid.uuid4(), uuid.uuid4()
    key = summary_cache_key(chamber_id=chamber, case_id=case, source_manifest_hash="a" * 64, prompt_version="summary-v1", policy_version=1)
    assert key == summary_cache_key(chamber_id=chamber, case_id=case, source_manifest_hash="a" * 64, prompt_version="summary-v1", policy_version=1)
    assert key != summary_cache_key(chamber_id=chamber, case_id=case, source_manifest_hash="a" * 64, prompt_version="summary-v1", policy_version=2)
