"""Tenant-scoped, deterministic retrieval comparison with no external model.

This is deliberately a small test harness, not a production RAG subsystem. It
demonstrates authorization-first source manifests and compares selection
strategies using only synthetic approved-source revisions.
"""

from __future__ import annotations

import enum
import re
from collections import Counter
from dataclasses import dataclass


class RetrievalScopeError(ValueError):
    """A caller asked for a source outside its tenant/approved manifest."""


class RetrievalStrategy(str, enum.Enum):
    full_context = "full_context"
    lexical = "lexical"
    semantic = "semantic"
    hybrid = "hybrid"


@dataclass(frozen=True)
class ApprovedSource:
    tenant_id: str
    revision_id: str
    content: str
    approved: bool = True


@dataclass(frozen=True)
class RetrievalHit:
    revision_id: str
    score: float
    strategy: RetrievalStrategy


@dataclass(frozen=True)
class EvaluationCase:
    tenant_id: str
    manifest_revision_ids: tuple[str, ...]
    query: str
    expected_revision_id: str


_TOKEN_RE = re.compile(r"[a-z0-9]+")
_SYNONYM_ROOTS = {
    "release": "bail",
    "custody": "bail",
    "liberty": "bail",
    "hearing": "listing",
    "court": "listing",
    "money": "fee",
    "payment": "fee",
}


def _tokens(text: str, *, semantic: bool = False) -> tuple[str, ...]:
    raw = _TOKEN_RE.findall(text.lower())
    if semantic:
        return tuple(_SYNONYM_ROOTS.get(token, token) for token in raw)
    return tuple(raw)


def _cosine(left: Counter[str], right: Counter[str]) -> float:
    if not left or not right:
        return 0.0
    numerator = sum(left[token] * right[token] for token in left.keys() & right.keys())
    left_norm = sum(value * value for value in left.values()) ** 0.5
    right_norm = sum(value * value for value in right.values()) ** 0.5
    return numerator / (left_norm * right_norm)


class SyntheticHybridRetriever:
    """Retrieves only explicit, approved source revisions from one tenant."""

    def __init__(self, sources: tuple[ApprovedSource, ...]) -> None:
        self._sources = {source.revision_id: source for source in sources}
        if len(self._sources) != len(sources):
            raise ValueError("source revision IDs must be globally unique in this POC")

    def _manifest_sources(
        self, *, tenant_id: str, manifest_revision_ids: tuple[str, ...]
    ) -> tuple[ApprovedSource, ...]:
        if not manifest_revision_ids:
            raise RetrievalScopeError("an explicit source manifest is required")
        selected: list[ApprovedSource] = []
        for revision_id in manifest_revision_ids:
            source = self._sources.get(revision_id)
            if source is None or source.tenant_id != tenant_id or not source.approved:
                raise RetrievalScopeError("source is unavailable in this approved tenant manifest")
            selected.append(source)
        return tuple(selected)

    def retrieve(
        self,
        *,
        tenant_id: str,
        manifest_revision_ids: tuple[str, ...],
        query: str,
        strategy: RetrievalStrategy,
        limit: int = 3,
    ) -> tuple[RetrievalHit, ...]:
        if not query.strip() or limit < 1:
            raise ValueError("query and positive limit are required")
        sources = self._manifest_sources(
            tenant_id=tenant_id, manifest_revision_ids=manifest_revision_ids
        )
        if strategy == RetrievalStrategy.full_context:
            return tuple(
                RetrievalHit(source.revision_id, 1.0, strategy)
                for source in sources[:limit]
            )

        lexical_query = Counter(_tokens(query))
        semantic_query = Counter(_tokens(query, semantic=True))
        lexical_scores = {
            source.revision_id: _cosine(lexical_query, Counter(_tokens(source.content)))
            for source in sources
        }
        semantic_scores = {
            source.revision_id: _cosine(
                semantic_query, Counter(_tokens(source.content, semantic=True))
            )
            for source in sources
        }
        if strategy == RetrievalStrategy.lexical:
            scores = lexical_scores
        elif strategy == RetrievalStrategy.semantic:
            scores = semantic_scores
        elif strategy == RetrievalStrategy.hybrid:
            # Reciprocal-rank fusion avoids pretending mock scores are calibrated.
            lexical_rank = self._rank(lexical_scores)
            semantic_rank = self._rank(semantic_scores)
            scores = {
                revision_id: (1 / (60 + lexical_rank[revision_id]))
                + (1 / (60 + semantic_rank[revision_id]))
                for revision_id in lexical_scores
            }
        else:  # pragma: no cover - enum guards this at runtime
            raise ValueError("unsupported retrieval strategy")
        return tuple(
            RetrievalHit(revision_id, score, strategy)
            for revision_id, score in sorted(scores.items(), key=lambda item: (-item[1], item[0]))[:limit]
        )

    @staticmethod
    def _rank(scores: dict[str, float]) -> dict[str, int]:
        return {
            revision_id: position
            for position, (revision_id, _) in enumerate(
                sorted(scores.items(), key=lambda item: (-item[1], item[0])), start=1
            )
        }


def evaluate_recall_at_one(
    retriever: SyntheticHybridRetriever,
    cases: tuple[EvaluationCase, ...],
    strategy: RetrievalStrategy,
) -> float:
    """Fixture-only recall@1; never use this as a legal-quality metric."""
    if not cases:
        raise ValueError("at least one evaluation case is required")
    hits = 0
    for case in cases:
        result = retriever.retrieve(
            tenant_id=case.tenant_id,
            manifest_revision_ids=case.manifest_revision_ids,
            query=case.query,
            strategy=strategy,
            limit=1,
        )
        hits += bool(result and result[0].revision_id == case.expected_revision_id)
    return hits / len(cases)
