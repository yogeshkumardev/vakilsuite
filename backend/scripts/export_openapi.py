"""Export the runtime API contract without connecting to database/storage."""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.main import app  # noqa: E402

if __name__ == "__main__":
    print(json.dumps(app.openapi(), indent=2, sort_keys=True))
