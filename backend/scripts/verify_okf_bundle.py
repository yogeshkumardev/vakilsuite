"""Verify a declared local OKF bundle without printing its source content."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.features.knowledge_bundles.loader import verify_bundle


def main() -> int:
    parser = argparse.ArgumentParser(description="Verify a VakilSuite OKF bundle")
    parser.add_argument("bundle", type=Path)
    args = parser.parse_args()
    bundle = verify_bundle(args.bundle)
    print(
        f"verified bundle={bundle.bundle_id} version={bundle.version} "
        f"manifest_sha256={bundle.manifest_sha256} entries={len(bundle.entries)}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
