"""Prepare a review snapshot or release an explicitly reviewed S528 template."""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.features.knowledge_bundles.release import release_template, review_snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["snapshot", "release"])
    parser.add_argument("batch", type=Path)
    parser.add_argument("--sample", required=True, choices=["S528_01", "S528_02", "S528_03"])
    parser.add_argument("--releases", type=Path)
    parser.add_argument("--reviewer")
    parser.add_argument("--expected-review-sha256")
    parser.add_argument("--confirm-derived-template-review", action="store_true")
    args = parser.parse_args()
    if args.action == "snapshot":
        print(json.dumps(review_snapshot(args.batch, args.sample), indent=2))
    else:
        if not args.releases or not args.reviewer or not args.expected_review_sha256:
            parser.error("Release requires --releases, --reviewer and --expected-review-sha256")
        path = release_template(args.batch, args.releases, sample_id=args.sample,
                                expected_review_sha256=args.expected_review_sha256,
                                reviewer=args.reviewer,
                                confirm_review=args.confirm_derived_template_review)
        print(json.dumps({"release": str(path), "indexed": False}))


if __name__ == "__main__":
    main()
