"""Run one minimal Sarvam chat-completion connectivity check."""

import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sarvamai import SarvamAI  # noqa: E402

from app.core.config import settings  # noqa: E402


def request_reply(api_key: str, model: str) -> str:
    """Return the reply without logging credentials or the raw SDK response."""
    client = SarvamAI(api_subscription_key=api_key)
    response: Any = client.chat.completions(
        model=model,
        messages=[{"role": "user", "content": "Reply with exactly: Sarvam connected"}],
        temperature=0,
        max_tokens=16,
    )
    reply = response.choices[0].message.content.strip()
    if not reply:
        raise RuntimeError("Sarvam returned an empty reply")
    return reply


def main() -> int:
    api_key = settings.SARVAM_API_KEY.strip()
    if not api_key:
        print(
            "SARVAM_API_KEY is missing. Add it to backend/.env and run again.",
            file=sys.stderr,
        )
        return 2

    try:
        reply = request_reply(api_key, settings.SARVAM_CHAT_MODEL)
    except Exception as exc:  # Provider details may contain sensitive request context.
        print(f"Sarvam smoke call failed ({type(exc).__name__}).", file=sys.stderr)
        return 1

    print(reply)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
