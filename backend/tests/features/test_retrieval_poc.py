from __future__ import annotations

import pytest

from app.features.retrieval_poc.core import (
    ApprovedSource,
    EvaluationCase,
    RetrievalScopeError,
    RetrievalStrategy,
    SyntheticHybridRetriever,
    evaluate_recall_at_one,
)


@pytest.fixture
def retriever() -> SyntheticHybridRetriever:
    return SyntheticHybridRetriever(
        (
            ApprovedSource("tenant-a", "a-bail", "Bail protects liberty after release from custody."),
            ApprovedSource("tenant-a", "a-fees", "Fee payment record and invoice details."),
            ApprovedSource("tenant-b", "b-confidential", "Custody strategy for tenant B confidential matter."),
        )
    )


def test_manifest_never_leaks_other_tenant_source(retriever: SyntheticHybridRetriever) -> None:
    with pytest.raises(RetrievalScopeError, match="unavailable"):
        retriever.retrieve(
            tenant_id="tenant-a",
            manifest_revision_ids=("a-bail", "b-confidential"),
            query="custody strategy",
            strategy=RetrievalStrategy.hybrid,
        )


def test_retrieval_returns_only_explicit_approved_manifest(retriever: SyntheticHybridRetriever) -> None:
    hits = retriever.retrieve(
        tenant_id="tenant-a",
        manifest_revision_ids=("a-bail",),
        query="fee payment",
        strategy=RetrievalStrategy.full_context,
    )

    assert [hit.revision_id for hit in hits] == ["a-bail"]


def test_mock_semantic_and_hybrid_retrieve_synonym_match(retriever: SyntheticHybridRetriever) -> None:
    for strategy in (RetrievalStrategy.semantic, RetrievalStrategy.hybrid):
        hits = retriever.retrieve(
            tenant_id="tenant-a",
            manifest_revision_ids=("a-bail", "a-fees"),
            query="release from custody",
            strategy=strategy,
            limit=1,
        )
        assert hits[0].revision_id == "a-bail"


def test_fixture_recall_gate_is_explicit_not_a_production_quality_claim(retriever: SyntheticHybridRetriever) -> None:
    cases = (
        EvaluationCase("tenant-a", ("a-bail", "a-fees"), "release from custody", "a-bail"),
        EvaluationCase("tenant-a", ("a-bail", "a-fees"), "invoice payment", "a-fees"),
    )

    assert evaluate_recall_at_one(retriever, cases, RetrievalStrategy.hybrid) == 1.0
