"""OpenAI Responses API implementation of the VakilSuite AI contract."""

from __future__ import annotations

import base64
import logging
import time
from typing import Any, TypeVar

from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.integrations.ai.contracts import (
    DraftInput,
    DraftPayload,
    DraftResult,
    ProviderError,
    ProviderErrorCode,
    ProviderName,
    SummarizeInput,
    SummarizeResult,
    SummaryPayload,
    TranscribeInput,
    TranscribeResult,
    TranscriptionPayload,
)

logger = logging.getLogger(__name__)
PayloadT = TypeVar("PayloadT", bound=BaseModel)


class OpenAIAdapter:
    provider_name = ProviderName.openai

    def __init__(self, model: str | None = None, *, client: Any | None = None) -> None:
        self.model = model or settings.OPENAI_MODEL
        allowed = frozenset(settings.OPENAI_ALLOWED_MODELS or [settings.OPENAI_MODEL])
        if not self.model or self.model not in allowed:
            raise ValueError(
                f"OpenAI model '{self.model}' is not in OPENAI_ALLOWED_MODELS"
            )
        if client is None:
            try:
                from openai import OpenAI
            except ImportError as exc:
                raise RuntimeError(
                    "OpenAI SDK is not installed; run `uv sync --locked` after "
                    "refreshing uv.lock."
                ) from exc
            client = OpenAI(
                api_key=settings.OPENAI_API_KEY,
                timeout=settings.AI_REQUEST_TIMEOUT_SECONDS,
                max_retries=0,
            )
        self._client = client
        logger.info("OpenAI adapter ready: model=%s", self.model)

    def _parse(
        self,
        *,
        input_items: Any,
        schema: type[PayloadT],
        max_output_tokens: int,
    ) -> tuple[PayloadT, Any]:
        response = self._client.responses.parse(
            model=self.model,
            input=input_items,
            text_format=schema,
            max_output_tokens=max_output_tokens,
        )
        parsed = response.output_parsed
        if isinstance(parsed, schema):
            return parsed, response
        if parsed is not None:
            return schema.model_validate(parsed), response
        raise ValueError("Provider returned no structured output")

    @staticmethod
    def _token_counts(response: Any) -> tuple[int | None, int | None]:
        usage = getattr(response, "usage", None)
        return getattr(usage, "input_tokens", None), getattr(usage, "output_tokens", None)

    def _map_exception(self, exc: Exception) -> ProviderError:
        request_id = getattr(exc, "request_id", None)
        outcome_unknown = False
        exception_name = type(exc).__name__
        status_code = int(getattr(exc, "status_code", 0) or 0)
        if isinstance(exc, (ValidationError, ValueError)):
            code, message, retryable = (
                ProviderErrorCode.invalid_response,
                "The provider returned an invalid structured response.",
                False,
            )
        elif exception_name == "RateLimitError" or status_code == 429:
            code, message, retryable = (
                ProviderErrorCode.rate_limit,
                "The provider rate limit was reached.",
                True,
            )
        elif status_code == 402:
            code, message, retryable = (
                ProviderErrorCode.quota_exhausted,
                "The provider project has no usable credits or quota.",
                False,
            )
        elif exception_name == "AuthenticationError" or status_code in {401, 403}:
            code, message, retryable = (
                ProviderErrorCode.authentication,
                "The provider rejected the configured credentials.",
                False,
            )
        elif exception_name == "BadRequestError" or status_code == 400:
            code, message, retryable = (
                ProviderErrorCode.invalid_input,
                "The provider rejected the request input.",
                False,
            )
        elif exception_name == "APITimeoutError":
            code, message, retryable, outcome_unknown = (
                ProviderErrorCode.timeout,
                "The provider request timed out; its billing outcome is unknown.",
                False,
                True,
            )
        elif exception_name in {"APIConnectionError", "APIStatusError"} or status_code >= 500:
            code, message, retryable, outcome_unknown = (
                ProviderErrorCode.unavailable,
                "The provider was unavailable; the request outcome is unknown.",
                False,
                True,
            )
        else:
            code, message, retryable, outcome_unknown = (
                ProviderErrorCode.unknown,
                "The provider request failed and its outcome is unknown.",
                False,
                True,
            )
        logger.error(
            "OpenAI request failed: code=%s type=%s request_id=%s",
            code.value,
            type(exc).__name__,
            request_id,
        )
        return ProviderError(
            provider=self.provider_name,
            error_code=code,
            message=message,
            retryable=retryable,
            outcome_unknown=outcome_unknown,
            provider_request_id=request_id,
        )

    def transcribe(self, input: TranscribeInput) -> TranscribeResult | ProviderError:
        content: list[dict[str, str]] = [
            {
                "type": "input_text",
                "text": (
                    f"Language hint: {input.language_hint}. Document type: "
                    f"{input.document_type}. Preserve page order and wording; mark "
                    "uncertain or missing material."
                ),
            }
        ]
        if input.file_bytes is not None:
            encoded = base64.b64encode(input.file_bytes).decode("ascii")
            data_url = f"data:{input.mime_type};base64,{encoded}"
            if (input.mime_type or "").startswith("image/"):
                content.append({"type": "input_image", "image_url": data_url})
            else:
                content.append(
                    {
                        "type": "input_file",
                        "filename": input.filename or "document.pdf",
                        "file_data": data_url,
                    }
                )
        else:
            content.append({"type": "input_text", "text": input.text_prompt or ""})

        started = time.monotonic()
        try:
            payload, response = self._parse(
                input_items=[
                    {
                        "role": "system",
                        "content": (
                            "Transcribe the supplied legal document. Do not summarize, "
                            "correct, translate, or invent missing text."
                        ),
                    },
                    {"role": "user", "content": content},
                ],
                schema=TranscriptionPayload,
                max_output_tokens=input.max_output_tokens,
            )
            input_tokens, output_tokens = self._token_counts(response)
            return TranscribeResult(
                provider=self.provider_name,
                model=self.model,
                blocks=payload.blocks,
                coverage_note=payload.coverage_note,
                latency_ms=int((time.monotonic() - started) * 1000),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                provider_request_id=getattr(response, "id", None),
                raw_finish_reason=getattr(response, "status", None),
            )
        except Exception as exc:
            return self._map_exception(exc)

    def summarize(self, input: SummarizeInput) -> SummarizeResult | ProviderError:
        facts = "\n".join(f"- {key}: {value}" for key, value in input.facts.items())
        started = time.monotonic()
        try:
            payload, response = self._parse(
                input_items=[
                    {
                        "role": "system",
                        "content": (
                            "Summarize only approved text and confirmed facts. Use only "
                            "the supplied source IDs; report conflicts as uncertainties."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Allowed source IDs: {', '.join(input.source_ids)}\n"
                            f"Language: {input.language}\nConfirmed facts:\n"
                            f"{facts or '(none)'}\n\nApproved text:\n{input.approved_text}"
                        ),
                    },
                ],
                schema=SummaryPayload,
                max_output_tokens=input.max_output_tokens,
            )
            if set(payload.source_ids) - set(input.source_ids):
                raise ValueError("Provider returned source IDs that were not supplied")
            input_tokens, output_tokens = self._token_counts(response)
            return SummarizeResult(
                provider=self.provider_name,
                model=self.model,
                latency_ms=int((time.monotonic() - started) * 1000),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                provider_request_id=getattr(response, "id", None),
                **payload.model_dump(),
            )
        except Exception as exc:
            return self._map_exception(exc)

    def draft(self, input: DraftInput) -> DraftResult | ProviderError:
        facts = "\n".join(
            f"- {key}: {value}" for key, value in input.approved_facts.items()
        )
        started = time.monotonic()
        try:
            payload, response = self._parse(
                input_items=[
                    {
                        "role": "system",
                        "content": (
                            "Draft from the selected template and approved facts only. "
                            "Never invent facts; return every required omission."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Template: {input.template_name}\n"
                            f"Source IDs: {', '.join(input.source_ids) or '(none)'}\n"
                            f"Instructions: {input.instructions}\nApproved facts:\n"
                            f"{facts or '(none)'}"
                        ),
                    },
                ],
                schema=DraftPayload,
                max_output_tokens=input.max_output_tokens,
            )
            input_tokens, output_tokens = self._token_counts(response)
            return DraftResult(
                provider=self.provider_name,
                model=self.model,
                latency_ms=int((time.monotonic() - started) * 1000),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                provider_request_id=getattr(response, "id", None),
                sections=payload.sections,
                missing_facts=payload.missing_facts,
            )
        except Exception as exc:
            return self._map_exception(exc)
