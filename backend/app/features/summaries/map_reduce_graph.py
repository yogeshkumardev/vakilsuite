"""Fixed reducer graph; durable fact cards and summary runs remain authoritative."""

from typing import Awaitable, Callable, TypedDict

from langgraph.graph import END, START, StateGraph


class ReduceState(TypedDict):
    card_statuses: list[str]
    decision: str
    result: str


async def run_reduce_graph(card_statuses: list[str], synthesize: Callable[[], Awaitable[str]]) -> str:
    async def assess(state: ReduceState) -> dict:
        statuses = state["card_statuses"]
        if any(status in {"failed", "blocked"} for status in statuses):
            return {"decision": "failed"}
        if all(status == "ready" for status in statuses):
            return {"decision": "synthesize"}
        return {"decision": "waiting"}

    async def reduce(_state: ReduceState) -> dict:
        return {"result": await synthesize()}

    async def wait(_state: ReduceState) -> dict:
        return {"result": "running"}

    async def fail(_state: ReduceState) -> dict:
        return {"result": "fact_card_failed"}

    graph = StateGraph(ReduceState)
    graph.add_node("assess_cards", assess)
    graph.add_node("synthesize", reduce)
    graph.add_node("waiting", wait)
    graph.add_node("failed", fail)
    graph.add_edge(START, "assess_cards")
    graph.add_conditional_edges("assess_cards", lambda state: state["decision"],
                                {"synthesize": "synthesize", "waiting": "waiting", "failed": "failed"})
    for node in ("synthesize", "waiting", "failed"):
        graph.add_edge(node, END)
    outcome = await graph.compile().ainvoke({"card_statuses": card_statuses, "decision": "", "result": ""})
    return outcome["result"]
