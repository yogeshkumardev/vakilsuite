"""Versioned LangGraph for legal-authority human review.

Domain tables remain authoritative; graph state carries only IDs/hashes.  The
caller supplies a durable checkpointer in production and an in-memory one in
tests. No provider request is made by this graph.
"""

from __future__ import annotations

from typing import Literal, Protocol, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt


LEGAL_RESEARCH_GRAPH_VERSION = "ik-v1"


class LegalResearchGraphState(TypedDict, total=False):
    run_id: str
    proposition_id: str
    review_id: str
    authority_version_id: str
    status: str
    terminal_error: str


class LegalResearchReviewLedger(Protocol):
    def review_status(self, review_id: str) -> Literal["pending", "approved", "rejected", "changes_requested", "revoked"]: ...
    def freeze_manifest_once(self, run_id: str, review_id: str) -> str: ...


def build_legal_research_graph(*, ledger: LegalResearchReviewLedger, checkpointer):
    """Pause at an advocate decision, then freeze exactly one manifest intent."""

    def await_review(state: LegalResearchGraphState) -> dict:
        review_id = state["review_id"]
        status = ledger.review_status(review_id)
        if status == "pending":
            interrupt({"kind": "legal_authority_review", "review_id": review_id, "run_id": state["run_id"], "graph_version": LEGAL_RESEARCH_GRAPH_VERSION})
            status = ledger.review_status(review_id)
        if status != "approved":
            return {"status": status, "terminal_error": f"REVIEW_{status.upper()}"}
        return {"status": "approved"}

    def freeze_manifest(state: LegalResearchGraphState) -> dict:
        if state.get("terminal_error"):
            return {}
        return {"status": "manifest_frozen", "review_id": ledger.freeze_manifest_once(state["run_id"], state["review_id"])}

    graph = StateGraph(LegalResearchGraphState)
    graph.add_node("await_review", await_review)
    graph.add_node("freeze_manifest", freeze_manifest)
    graph.add_edge(START, "await_review")
    graph.add_edge("await_review", "freeze_manifest")
    graph.add_edge("freeze_manifest", END)
    return graph.compile(checkpointer=checkpointer)
