"""Single Gemini submission; caller durably records dispatch before invoking."""

from google import genai
from google.genai import types

from app.core.config import settings
from app.features.okf_exports.draft_contract import DRAFT_RESPONSE_SCHEMA, SYSTEM


def generate(*, model, prompt, max_output_tokens, deadline_seconds):
    with genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(
            timeout=deadline_seconds * 1000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    ) as client:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM,
                response_mime_type="application/json",
                response_json_schema=DRAFT_RESPONSE_SCHEMA,
                max_output_tokens=max_output_tokens,
                thinking_config=types.ThinkingConfig(
                    thinking_level=settings.GEMINI_SUMMARY_THINKING_LEVEL
                ),
                automatic_function_calling=types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            ),
        )
    usage = response.usage_metadata
    # Persist response and usage before parsing; invalid/truncated outputs can be billed.
    return {
        "text": response.text or "",
        "finish": str(
            getattr(
                response.candidates[0].finish_reason,
                "value",
                response.candidates[0].finish_reason,
            )
        )
        if response.candidates
        else "MISSING",
        "request_id": response.response_id,
        "input_tokens": getattr(usage, "prompt_token_count", None),
        "output_tokens": getattr(usage, "candidates_token_count", None),
        "thinking_tokens": getattr(usage, "thoughts_token_count", None),
    }
