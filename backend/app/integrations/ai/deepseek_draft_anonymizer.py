"""Bounded DeepSeek comparison adapter; local span validation stays mandatory."""

import json
from datetime import date
from openai import OpenAI
from app.core.config import settings
from app.features.draft_anonymization.costs import DraftBudget
from app.integrations.ai.draft_anonymizer import (
    PROMPT,
    DETECTION_RESPONSE_SCHEMA,
    decode_detection,
)


class DeepSeekDraftDetector:
    def __init__(
        self, *, budget: DraftBudget, model: str, on_progress=None, on_response=None
    ):
        if not settings.DEEPSEEK_API_KEY:
            raise ValueError("DEEPSEEK_CONFIGURATION_REQUIRED")
        if model != "deepseek-flash" or date.today() > date(2026, 12, 31):
            raise ValueError("ANONYMIZATION_PRICING_UNSUPPORTED")
        self.model, self.budget = model, budget
        self.calls, self.attempts = 0, []
        self.on_progress, self.on_response = on_progress, on_response
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com",
            max_retries=0,
            timeout=120,
        )

    def detect(self, blocks, *, audit=False):
        if self.calls >= 2:
            raise ValueError("CALL_LIMIT")
        stage = "audit" if audit else "detection"
        limit = 2048 if audit else 8192
        instruction = (
            PROMPT
            + "\nReturn JSON matching this schema: "
            + json.dumps(DETECTION_RESPONSE_SCHEMA, separators=(",", ":"))
        )
        instruction += (
            '\nExample for no private identifiers: {"findings":[],"uncertain":false}'
        )
        if audit:
            instruction += (
                "\nIndependently audit for all remaining private identifiers."
            )
        messages = [
            {"role": "system", "content": instruction},
            {
                "role": "user",
                "content": json.dumps(
                    blocks, ensure_ascii=False, separators=(",", ":")
                ),
            },
        ]
        reservation = self.budget.reserve(
            len(json.dumps(messages, ensure_ascii=False).encode()) + 4096,
            limit,
            {
                "provider": "deepseek",
                "model": self.model,
                "stage": stage,
                "thinking": "disabled",
            },
        )
        self.calls += 1
        if self.on_progress:
            self.on_progress(
                {"stage": stage, "calls_started": self.calls, "provider": "deepseek"}
            )
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0,
            max_tokens=limit,
            response_format={"type": "json_object"},
            extra_body={"thinking": {"type": "disabled"}},
        )
        u = response.usage
        usage = None
        if u is not None and all(
            type(n) is int and n >= 0
            for n in (u.prompt_tokens, u.completion_tokens, u.total_tokens)
        ):
            if u.total_tokens >= u.prompt_tokens + u.completion_tokens:
                usage = {
                    "prompt_tokens": u.prompt_tokens,
                    "output_tokens": u.completion_tokens,
                    "total_tokens": u.total_tokens,
                    "billable_output_tokens": u.total_tokens - u.prompt_tokens,
                    "thinking_tokens": getattr(
                        getattr(u, "completion_tokens_details", None),
                        "reasoning_tokens",
                        None,
                    ),
                }
        accounting = self.budget.settle(reservation, usage)
        self.attempts.append({**accounting, "response_id": response.id})
        if self.on_response:
            self.on_response(
                {
                    "stage": stage,
                    "call": self.calls,
                    "provider": "deepseek",
                    "response": response.model_dump(mode="json"),
                }
            )
        if len(response.choices) != 1 or response.choices[0].finish_reason != "stop":
            raise ValueError("INCOMPLETE_PROVIDER_OUTPUT")
        return decode_detection(response.choices[0].message.content or "")

    def close(self):
        self.client.close()
