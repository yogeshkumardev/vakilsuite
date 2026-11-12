"""Offline integrity/selection check; no provider, database or index writes."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.features.knowledge_bundles.s528_testing import prepare_test_context


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("batch", type=Path)
    args = parser.parse_args()
    results = []
    for sample in ("S528_01", "S528_02", "S528_03"):
        context = prepare_test_context(args.batch, sample_id=sample)
        results.append({"sample": sample, "entries": len(context["guidance"]),
                        "chunks": len(context["candidate_chunk_ids"]),
                        "production_eligible": context["production_eligible"]})
    print(json.dumps({"checks": results, "provider_calls": 0}))


if __name__ == "__main__":
    main()
