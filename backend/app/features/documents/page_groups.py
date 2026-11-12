"""Bounded, deterministic page groups for recoverable extraction attempts."""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

MAX_PAGES_PER_GROUP = 10
MAX_PAGE_GROUPS = 50

@dataclass(frozen=True)
class PageGroup:
    group_id: str
    first_page: int
    last_page: int
    page_ids: tuple[str, ...]

def stable_page_id(file_version_id: str, page_number: int) -> str:
    if page_number < 1:
        raise ValueError("page_number must be positive")
    digest = hashlib.sha256(f"{file_version_id}:{page_number}".encode()).hexdigest()[:20]
    return f"page_{digest}"

def build_page_groups(file_version_id: str, page_count: int, *, pages_per_group: int = MAX_PAGES_PER_GROUP) -> tuple[PageGroup, ...]:
    if not file_version_id:
        raise ValueError("file_version_id is required")
    if page_count < 1 or page_count > MAX_PAGE_GROUPS * MAX_PAGES_PER_GROUP:
        raise ValueError("page count exceeds extraction limits")
    if pages_per_group < 1 or pages_per_group > MAX_PAGES_PER_GROUP:
        raise ValueError("pages_per_group exceeds extraction limits")
    groups: list[PageGroup] = []
    for first in range(1, page_count + 1, pages_per_group):
        last = min(first + pages_per_group - 1, page_count)
        group_digest = hashlib.sha256(f"{file_version_id}:{first}:{last}".encode()).hexdigest()[:20]
        groups.append(PageGroup(group_id=f"group_{group_digest}", first_page=first, last_page=last, page_ids=tuple(stable_page_id(file_version_id, page) for page in range(first, last + 1))))
    return tuple(groups)
