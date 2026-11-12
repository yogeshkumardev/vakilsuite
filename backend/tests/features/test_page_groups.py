import pytest
from app.features.documents.page_groups import build_page_groups, stable_page_id

def test_groups_are_deterministic_and_bounded():
    groups = build_page_groups("version-a", 23)
    assert [(item.first_page, item.last_page) for item in groups] == [(1, 10), (11, 20), (21, 23)]
    assert groups == build_page_groups("version-a", 23)
    assert len(groups[0].page_ids) == 10

def test_page_ids_are_stable_per_source_version():
    assert stable_page_id("version-a", 1) == stable_page_id("version-a", 1)
    assert stable_page_id("version-a", 1) != stable_page_id("version-b", 1)

@pytest.mark.parametrize("count", [0, 501])
def test_rejects_resource_limit_violations(count):
    with pytest.raises(ValueError):
        build_page_groups("version-a", count)
