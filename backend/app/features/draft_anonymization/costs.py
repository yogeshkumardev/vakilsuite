"""Durable local-CLI spending reservations. Amounts are USD nanodollars.

Estimates use published Standard-tier prices, not invoice/tax/FX accounting.
Uncertain requests retain their full reservation; new attempt labels never
reset the shared content budget. SQLite transactions serialize local workers.
"""

import json
import sqlite3
import uuid
from datetime import date
from pathlib import Path

USD_SCALE = 1_000_000_000
INPUT_RATE = 750  # $0.75 / million tokens, in nanodollars per token
OUTPUT_RATE = 3750  # $3.75 / million tokens, including thinking
PRICING_VERSION = "gemini-3.6-flash-standard-2026-11-01"


def check_pricing(model: str) -> None:
    if model.removeprefix("models/") != "gemini-3.6-flash":
        raise ValueError("ANONYMIZATION_PRICING_UNSUPPORTED")
    if date.today() > date(2026, 12, 31):
        raise ValueError("ANONYMIZATION_PRICING_EXPIRED")


class DraftBudget:
    def __init__(
        self,
        path: Path,
        scope: str,
        limit: int,
        *,
        input_rate: int = INPUT_RATE,
        output_rate: int = OUTPUT_RATE,
        pricing_version: str = PRICING_VERSION,
    ):
        if limit <= 0:
            raise ValueError("INVALID_DRAFT_BUDGET")
        self.path, self.scope, self.limit = path, scope, limit
        if input_rate <= 0 or output_rate <= 0:
            raise ValueError("INVALID_PRICING")
        self.input_rate, self.output_rate, self.pricing_version = (
            input_rate,
            output_rate,
            pricing_version,
        )
        path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        with sqlite3.connect(path) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS attempts (
                id TEXT PRIMARY KEY, scope TEXT NOT NULL, state TEXT NOT NULL,
                reserved INTEGER NOT NULL, charged INTEGER NOT NULL,
                details TEXT NOT NULL)""")
        path.chmod(0o600)

    def reserve(self, input_bound: int, output_limit: int, metadata: dict) -> str:
        amount = input_bound * self.input_rate + output_limit * self.output_rate
        token = uuid.uuid4().hex
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            rows = db.execute(
                "SELECT state, charged FROM attempts WHERE scope=?", (self.scope,)
            ).fetchall()
            if any(state == "usage_overrun" for state, _ in rows):
                raise ValueError("DRAFT_BUDGET_RECONCILIATION_REQUIRED")
            if sum(charged for _, charged in rows) + amount > self.limit:
                raise ValueError("DRAFT_BUDGET_EXCEEDED")
            details = {
                **metadata,
                "pricing_version": self.pricing_version,
                "input_rate_nano_usd": self.input_rate,
                "output_rate_nano_usd": self.output_rate,
                "input_token_bound": input_bound,
                "output_token_limit": output_limit,
            }
            db.execute(
                "INSERT INTO attempts VALUES (?, ?, ?, ?, ?, ?)",
                (
                    token,
                    self.scope,
                    "reserved_or_unknown",
                    amount,
                    amount,
                    json.dumps(details),
                ),
            )
        return token

    def settle(self, token: str, usage: dict | None) -> dict:
        with sqlite3.connect(self.path, timeout=10) as db:
            db.execute("BEGIN IMMEDIATE")
            row = db.execute(
                "SELECT state, reserved, details FROM attempts WHERE id=? AND scope=?",
                (token, self.scope),
            ).fetchone()
            if row is None or row[0] != "reserved_or_unknown":
                raise ValueError("INVALID_BUDGET_RESERVATION")
            details = json.loads(row[2])
            amount, state = row[1], "reserved_or_unknown"
            if usage is not None:
                details.update(usage)
                amount = usage["prompt_tokens"] * details.get(
                    "input_rate_nano_usd", INPUT_RATE
                ) + usage["billable_output_tokens"] * details.get(
                    "output_rate_nano_usd", OUTPUT_RATE
                )
                state = "usage_overrun" if amount > row[1] else "measured"
            details.update(state=state, estimated_usd=amount / USD_SCALE)
            db.execute(
                "UPDATE attempts SET state=?, charged=?, details=? WHERE id=?",
                (state, amount, json.dumps(details), token),
            )
        return details

    def summary(self) -> dict:
        with sqlite3.connect(self.path) as db:
            rows = db.execute(
                "SELECT state, charged FROM attempts WHERE scope=?", (self.scope,)
            ).fetchall()
        return {
            "limit_usd": self.limit / USD_SCALE,
            "estimated_or_reserved_usd": sum(row[1] for row in rows) / USD_SCALE,
            "unknown_attempts": sum(row[0] == "reserved_or_unknown" for row in rows),
            "attempt_count": len(rows),
            "pricing_version": self.pricing_version,
        }


def usage_counts(usage) -> dict | None:
    if usage is None:
        return None
    prompt = getattr(usage, "prompt_token_count", None)
    output = getattr(usage, "candidates_token_count", None)
    thoughts = getattr(usage, "thoughts_token_count", None) or 0
    total = getattr(usage, "total_token_count", None)
    if any(type(n) is not int or n < 0 for n in (prompt, output, thoughts, total)):
        return None
    if total < prompt + output + thoughts:
        return None
    return {
        "prompt_tokens": prompt,
        "output_tokens": output,
        "thinking_tokens": thoughts,
        "total_tokens": total,
        "billable_output_tokens": max(output + thoughts, total - prompt),
    }
