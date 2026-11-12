"""Server-owned graph registry; clients never choose executable graph code."""
from dataclasses import dataclass
from app.features.workflows.poc import POC_GRAPH_VERSION

@dataclass(frozen=True)
class GraphDefinition:
    workflow_type: str
    graph_version: str
    resumable: bool = True

_REGISTRY = {"s01_poc": GraphDefinition("s01_poc", POC_GRAPH_VERSION)}

def require_registered_graph(workflow_type: str, graph_version: str) -> GraphDefinition:
    graph = _REGISTRY.get(workflow_type)
    if graph is None or graph.graph_version != graph_version:
        raise ValueError("Workflow graph version is not registered")
    return graph
