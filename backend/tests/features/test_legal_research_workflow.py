from dataclasses import dataclass, field

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.features.legal_research.workflow import build_legal_research_graph


@dataclass
class Ledger:
    status: str = "pending"
    frozen: dict[str, str] = field(default_factory=dict)

    def review_status(self, review_id: str) -> str:
        return self.status

    def freeze_manifest_once(self, run_id: str, review_id: str) -> str:
        return self.frozen.setdefault(run_id, review_id)


def test_graph_interrupts_then_freezes_once_after_approval() -> None:
    ledger = Ledger()
    graph = build_legal_research_graph(ledger=ledger, checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "legal-run-1"}}
    first = graph.invoke({"run_id": "run-1", "review_id": "review-1"}, config)
    assert first["__interrupt__"]
    ledger.status = "approved"
    second = graph.invoke(Command(resume={}), config)
    assert second["status"] == "manifest_frozen"
    assert ledger.frozen == {"run-1": "review-1"}
