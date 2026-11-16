"""Gemini implementation of the narrow VakilSuite AI contract."""

from __future__ import annotations

import base64
import json
import logging
import time
from typing import Any, TypeVar

import httpx
from google import genai
from google.genai import errors, types
from pydantic import BaseModel, ConfigDict, ValidationError, create_model

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
from app.features.summaries.contracts import CaseSummaryPayload, FindingType, SummarySectionName
from app.features.summaries.prompt import SIMPLE_INSTRUCTION

logger = logging.getLogger(__name__)
PayloadT = TypeVar("PayloadT", bound=BaseModel)


def _case_summary_response_schema() -> dict[str, Any]:
    """Small decoding grammar; domain limits and source checks stay in Pydantic.

    Merely allowing supported JSON Schema keywords is insufficient: nested
    maxItems (15 x 100 x 25 x 50), enums and optional properties create a huge
    decoding grammar that Gemini can reject before generation. Keep every leaf
    typed, inline the shape, and put enum choices in the instruction instead.
    """
    citation = {
        "type": "object",
        "properties": {
            "source_document_id": {"type": "string"},
            "source_revision_id": {"type": "string"},
            "page_number": {"type": ["integer", "null"]},
            "source_paths": {"type": "array", "items": {"type": "string"}},
            "page_reference_note": {"type": "string"},
        },
        "required": ["source_document_id", "source_revision_id", "page_number",
                     "source_paths", "page_reference_note"],
    }
    finding = {
        "type": "object",
        "properties": {
            "text": {"type": "string"},
            "finding_type": {"type": "string"},
            "citations": {"type": "array", "items": citation},
        },
        "required": ["text", "finding_type", "citations"],
    }
    return {
        "type": "object",
        "properties": {
            "output_language": {"type": "string"},
            "sections": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "findings": {"type": "array", "items": finding},
                    },
                    "required": ["name", "findings"],
                },
            },
            "uncertainties": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["output_language", "sections", "uncertainties"],
    }


def _log_summary_http_error(response: httpx.Response) -> None:
    """Log useful classifications, never free-form provider echoes of evidence."""
    try:
        body = response.json()
        error = body.get("error", {}) if isinstance(body, dict) else {}
        if not isinstance(error, dict):
            error = {}
    except ValueError:
        error = {}
    message = str(error.get("message", "")).casefold()
    if any(term in message for term in ("too many states", "too much branching", "schema is too complex", "schema complexity")):
        reason = "response_schema_too_complex"
    elif any(term in message for term in ("response_json_schema", "responsejsonschema", "response_schema", "response schema")):
        reason = "response_schema_invalid"
    elif any(term in message for term in ("thinking", "thinkingconfig")):
        reason = "thinking_configuration_invalid"
    elif any(term in message for term in ("mime", "inline_data", "inlinedata", "pdf", "document")):
        reason = "document_input_invalid"
    else:
        reason = "request_rejected"
    fields = set()
    details = error.get("details")
    for detail in details[:20] if isinstance(details, list) else []:
        if not isinstance(detail, dict):
            continue
        violations = detail.get("fieldViolations")
        for violation in violations[:20] if isinstance(violations, list) else []:
            if not isinstance(violation, dict):
                continue
            field = str(violation.get("field", "")).replace("_", "").casefold()
            # Fixed labels prevent provider-controlled field names leaking text.
            for token, label in (
                ("responsejsonschema", "responseJsonSchema"),
                ("responseschema", "responseSchema"),
                ("thinking", "thinkingConfig"),
                ("contents", "contents"),
                ("maxoutputtokens", "maxOutputTokens"),
            ):
                if token in field:
                    fields.add(label)
    logger.warning(
        "Gemini summary rejected: status=%s reason=%s fields=%s",
        response.status_code, reason, sorted(fields),
    )


def _summary_validation_issues(exc: ValidationError, schema: type[BaseModel]) -> list[dict]:
    """Log contract locations and error codes, never returned values/messages.

    Extra keys can themselves contain document text, so redact any location
    component that is not a field declared by the application's schema.
    """
    fields: set[str] = set()

    def collect(node: Any) -> None:
        if isinstance(node, dict):
            fields.update(node.get("properties", {}))
            for child in node.values():
                collect(child)
        elif isinstance(node, list):
            for child in node:
                collect(child)

    collect(schema.model_json_schema())
    return [
        {
            "path": [
                part if isinstance(part, int) or part in fields else "<field>"
                for part in error["loc"][:16]
            ],
            "code": error["type"],
        }
        for error in exc.errors(include_input=False, include_context=False, include_url=False)[:10]
    ]


def _extract_json_text(text: str) -> str:
    """Extract clean JSON from model output that may have markdown wrapping."""
    cleaned = text.strip()
    if not cleaned:
        return cleaned
    # Strip BOM
    if cleaned[0] == "\ufeff":
        cleaned = cleaned[1:]
    # Strip markdown code fences (```json ... ``` or ``` ... ```)
    if cleaned.startswith("```"):
        first_nl = cleaned.find("\n")
        if first_nl < 0:
            return cleaned
        inner = cleaned[first_nl + 1:]
        if inner.rstrip().endswith("```"):
            inner = inner.rstrip()[:-3].rstrip()
        cleaned = inner.strip()
    return cleaned


def _strip_extra_fields_from_errors(
    value: dict[str, Any], exc: ValidationError,
) -> dict[str, Any]:
    """Remove exactly the fields that Pydantic flagged as extra_forbidden.

    Processes deepest locations first so that nested deletions do not
    invalidate shallower paths.  Mutates *value* in place.
    """
    extras = [
        e["loc"]
        for e in exc.errors(
            include_input=False, include_context=False, include_url=False
        )
        if e["type"] == "extra_forbidden" and e["loc"]
    ]
    for loc in sorted(extras, key=len, reverse=True):
        node = value
        for part in loc[:-1]:
            if isinstance(part, str) and isinstance(node, dict):
                node = node.get(part)
            elif isinstance(part, int) and isinstance(node, list) and part < len(node):
                node = node[part]
            else:
                node = None
                break
        if node is not None and isinstance(node, dict) and isinstance(loc[-1], str):
            node.pop(loc[-1], None)
    return value


def _validate_summary_response(text: str, schema: type[PayloadT]) -> PayloadT:
    """Parse and repair Gemini summary JSON with progressive fallback.

    Gemini JSON mode may add undeclared sections or nested fields, produce
    broken internal fact references, or wrap output in markdown fences.
    Apply targeted, safe repairs while preserving all required schema
    constraints and citation grounding.
    """
    from app.features.summaries.structured import SectionsV2, StructuredSummary

    cleaned = _extract_json_text(text)

    try:
        return schema.model_validate_json(cleaned)
    except ValidationError as first_exc:
        if schema is not StructuredSummary:
            raise

        # Need a parsed dict for any repair attempt
        try:
            value = json.loads(cleaned)
        except json.JSONDecodeError:
            raise first_exc

        if not isinstance(value, dict):
            raise first_exc

        errors = first_exc.errors(
            include_input=False, include_context=False, include_url=False
        )
        error_types = {e["type"] for e in errors}
        repairable = {"extra_forbidden", "summary_unresolved_reference"}

        if not error_types & repairable:
            raise

        repairs: list[str] = []

        # Collect extra sections before stripping so they can be preserved
        section_extras: dict[str, Any] = {}
        if "extra_forbidden" in error_types and isinstance(value.get("sections"), dict):
            allowed_sections = set(SectionsV2.model_fields.keys())
            section_extras = {
                k: v for k, v in value["sections"].items()
                if k not in allowed_sections
            }

        # Repair 1: strip extra forbidden fields at any nesting level
        if "extra_forbidden" in error_types:
            value = _strip_extra_fields_from_errors(value, first_exc)
            repairs.append("extra_forbidden")

        # Repair 2: drop unresolved internal references
        if "summary_unresolved_reference" in error_types:
            value, removed = _drop_unresolved_summary_references(value)
            if removed:
                repairs.append(f"unresolved_references({removed})")

        if not repairs:
            raise first_exc

        try:
            payload = schema.model_validate(value)
        except ValidationError:
            raise first_exc

        # Preserve extra sections for advocate review instead of discarding
        if section_extras:
            payload.additional_sections = section_extras
            repairs.append(f"preserved_sections({','.join(section_extras)})")

        logger.info("Gemini summary repaired: %s", ", ".join(repairs))
        return payload


def _drop_unresolved_summary_references(value: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """Remove broken model-generated fact links, never facts or source citations.

    Analyses that lose every factual basis and matrix rows with no allegation
    are omitted. The summary records this repair as a visible uncertainty.
    """
    ids: set[str] = set()

    def collect(node: Any) -> None:
        if isinstance(node, dict):
            if {"id", "text", "status", "citations"} <= node.keys() and isinstance(node["id"], str):
                ids.add(node["id"])
            for child in node.values():
                collect(child)
        elif isinstance(node, list):
            for child in node:
                collect(child)

    collect(value.get("sections", {}))
    removed = 0
    reference_lists = {
        "basis_fact_ids", "supporting_fact_ids", "defence_fact_ids",
        "competing_fact_ids", "related_fact_ids",
    }

    def repair(node: Any) -> None:
        nonlocal removed
        if isinstance(node, list):
            for child in node:
                repair(child)
            return
        if not isinstance(node, dict):
            return
        for key, child in list(node.items()):
            if key in reference_lists and isinstance(child, list):
                valid = [ident for ident in child if ident in ids]
                removed += len(child) - len(valid)
                node[key] = valid
            else:
                repair(child)
        for key in ("legal_significance", "defence_observation"):
            analysis = node.get(key)
            if isinstance(analysis, dict) and not analysis.get("basis_fact_ids"):
                node[key] = None
        for key in ("observations", "inconsistencies", "ai_suggested"):
            if isinstance(node.get(key), list):
                node[key] = [
                    item for item in node[key]
                    if not isinstance(item, dict) or item.get("basis_fact_ids")
                ]
        if isinstance(node.get("conflicts"), list):
            node["conflicts"] = [
                item for item in node["conflicts"]
                if not isinstance(item, dict) or (
                    len(item.get("competing_fact_ids", [])) >= 2
                    and (item.get("observation") or {}).get("basis_fact_ids")
                )
            ]
        if isinstance(node.get("allegation_evidence_defence_matrix"), list):
            rows = node["allegation_evidence_defence_matrix"]
            removed += sum(
                isinstance(row, dict) and row.get("allegation_fact_id") not in ids
                for row in rows
            )
            node["allegation_evidence_defence_matrix"] = [
                row for row in rows
                if not isinstance(row, dict) or row.get("allegation_fact_id") in ids
            ]

    repair(value.get("sections", {}))
    if removed:
        uncertainties = value.get("uncertainties")
        if isinstance(uncertainties, list) and len(uncertainties) < 200:
            uncertainties.append(
                "Some AI analysis references could not be matched to cited facts and were omitted. Review the remaining analysis against the original documents."
            )
    return value, removed


def _summary_request(
    *, contents: str, pdf_sources: list[dict] | None,
    system_instruction: str, schema: type[BaseModel], max_output_tokens: int,
) -> dict[str, Any]:
    """Construct the auditable REST wire format (mimeType, not mime_type)."""
    from app.features.summaries.structured import StructuredSummary

    config: dict[str, Any] = {
        "responseMimeType": "application/json",
        "maxOutputTokens": max_output_tokens,
        "thinkingConfig": {"thinkingLevel": settings.GEMINI_SUMMARY_THINKING_LEVEL},
    }
    # The v2 schema exceeds Gemini's constrained-decoding limits. A shell of
    # untyped objects forces empty sections. Use JSON mode with the complete
    # contract in the instruction, then validate it and its citations locally.
    if schema is not StructuredSummary:
        config["responseJsonSchema"] = _case_summary_response_schema()
    parts: list[dict[str, Any]] = [{"text": contents}]
    for item in pdf_sources or []:
        parts.extend((
            {"text": (
                f"ORIGINAL PDF source_document_id={item['source_document_id']} "
                f"source_revision_id={item['source_revision_id']}"
            )},
            {"inlineData": {
                "mimeType": "application/pdf",
                "data": base64.b64encode(item["data"]).decode("ascii"),
            }},
        ))
    return {
        "contents": [{"role": "user", "parts": parts}],
        "systemInstruction": {"parts": [{"text": system_instruction}]},
        "generationConfig": config,
    }


class GeminiAdapter:
    provider_name = ProviderName.gemini

    def __init__(
        self,
        model: str | None = None,
        *,
        client: Any | None = None,
        timeout_seconds: int | None = None,
    ) -> None:
        self.model = model or settings.GEMINI_MODEL
        allowed = frozenset(settings.GEMINI_ALLOWED_MODELS or [settings.GEMINI_MODEL])
        if not self.model or self.model not in allowed:
            raise ValueError(
                f"Gemini model '{self.model}' is not in GEMINI_ALLOWED_MODELS"
            )
        request_timeout_seconds = timeout_seconds or settings.AI_REQUEST_TIMEOUT_SECONDS
        self._client = client or genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=types.HttpOptions(
                timeout=request_timeout_seconds * 1000,
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )
        logger.info("Gemini adapter ready: model=%s", self.model)

    def _generate(
        self,
        *,
        contents: Any,
        system_instruction: str,
        schema: type[PayloadT],
        max_output_tokens: int,
    ) -> tuple[PayloadT, Any]:
        response = self._client.models.generate_content(
            model=self.model,
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                # The Gemini Developer API rejects Pydantic's
                # ``additionalProperties: false`` when the SDK converts a model
                # through the OpenAPI-style ``response_schema`` field. Send the
                # full JSON Schema through its dedicated field instead, then
                # validate the returned JSON with the strict Pydantic model below.
                response_json_schema=schema.model_json_schema(),
            ),
        )
        parsed = response.parsed
        if isinstance(parsed, schema):
            return parsed, response
        if parsed is not None:
            return schema.model_validate(parsed), response
        if response.text:
            return schema.model_validate_json(response.text), response
        raise ValueError("Provider returned no structured output")

    @staticmethod
    def _case_summary_contents(
        contents: str, pdf_sources: list[dict] | None
    ) -> Any:
        return (
            [
                contents,
                *[
                    part
                    for item in (pdf_sources or [])
                    for part in (
                        f"ORIGINAL PDF source_document_id={item['source_document_id']} source_revision_id={item['source_revision_id']}",
                        types.Part.from_bytes(
                            data=item["data"], mime_type="application/pdf"
                        ),
                    )
                ],
            ]
            if pdf_sources
            else contents
        )

    def count_case_summary_tokens(
        self, *, contents: str, pdf_sources: list[dict] | None = None
    ) -> int | ProviderError:
        """Count the exact multimodal summary input without generating output."""
        try:
            response = self._client.models.count_tokens(
                model=self.model,
                contents=self._case_summary_contents(contents, pdf_sources),
            )
            total = getattr(response, "total_tokens", None)
            if not isinstance(total, int) or total <= 0:
                raise ValueError("Provider returned no usable token count")
            return total
        except Exception as exc:
            return self._map_exception(exc)

    @staticmethod
    def _token_counts(response: Any) -> tuple[int | None, int | None]:
        usage = getattr(response, "usage_metadata", None)
        return (
            getattr(usage, "prompt_token_count", None),
            getattr(usage, "candidates_token_count", None),
        )

    @staticmethod
    def _finish_reason(response: Any) -> str | None:
        try:
            reason = response.candidates[0].finish_reason
            return getattr(reason, "name", str(reason))
        except (AttributeError, IndexError, TypeError):
            return None

    def _map_exception(self, exc: Exception) -> ProviderError:
        request_id = getattr(exc, "request_id", None)
        outcome_unknown = False

        if isinstance(exc, (httpx.TimeoutException, TimeoutError)):
            code, message, retryable, outcome_unknown = (
                ProviderErrorCode.timeout,
                "The provider request timed out; its billing outcome is unknown.",
                False,
                True,
            )
        elif isinstance(exc, (ValidationError, ValueError)):
            code = ProviderErrorCode.invalid_response
            message = "The provider returned an invalid structured response."
            retryable = False
        elif isinstance(exc, errors.APIError):
            status = int(getattr(exc, "code", 0) or 0)
            if status == 429:
                code, message, retryable = (
                    ProviderErrorCode.rate_limit,
                    "The provider rate limit was reached.",
                    True,
                )
            elif status == 402:
                code, message, retryable = (
                    ProviderErrorCode.quota_exhausted,
                    "The provider project has no usable credits or quota.",
                    False,
                )
            elif status in {401, 403}:
                code, message, retryable = (
                    ProviderErrorCode.authentication,
                    "The provider rejected the configured credentials.",
                    False,
                )
            elif status == 400:
                code, message, retryable = (
                    ProviderErrorCode.invalid_input,
                    "The provider rejected the request input.",
                    False,
                )
            elif status in {408, 504}:
                code, message, retryable, outcome_unknown = (
                    ProviderErrorCode.timeout,
                    "The provider request timed out; its billing outcome is unknown.",
                    False,
                    True,
                )
            elif status >= 500:
                code, message, retryable, outcome_unknown = (
                    ProviderErrorCode.unavailable,
                    "The provider was unavailable; the request outcome is unknown.",
                    False,
                    True,
                )
            else:
                code, message, retryable = (
                    ProviderErrorCode.unknown,
                    "The provider request failed.",
                    False,
                )
        else:
            raw = str(exc).lower()
            if "safety" in raw or "blocked" in raw:
                code, message, retryable = (
                    ProviderErrorCode.safety_block,
                    "The provider blocked this content.",
                    False,
                )
            elif "timeout" in raw or "deadline" in raw:
                code, message, retryable, outcome_unknown = (
                    ProviderErrorCode.timeout,
                    "The provider request timed out; its billing outcome is unknown.",
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
            "Gemini request failed: code=%s type=%s request_id=%s",
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
        contents: list[Any] = [
            (
                f"Language hint: {input.language_hint}. "
                f"Document type: {input.document_type}. "
                "Preserve page order and wording. Mark uncertain text and explain "
                "any missing page or illegible region in coverage_note."
            )
        ]
        if input.file_bytes is not None:
            contents.append(
                types.Part.from_bytes(
                    data=input.file_bytes, mime_type=input.mime_type or ""
                )
            )
        else:
            contents.append(input.text_prompt or "")

        started = time.monotonic()
        try:
            payload, response = self._generate(
                contents=contents,
                system_instruction=(
                    "Transcribe the supplied legal document. Do not summarize, correct, "
                    "translate, or invent missing text."
                ),
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
                provider_request_id=getattr(response, "response_id", None),
                raw_finish_reason=self._finish_reason(response),
            )
        except Exception as exc:
            return self._map_exception(exc)

    def summarize(self, input: SummarizeInput) -> SummarizeResult | ProviderError:
        facts = "\n".join(f"- {key}: {value}" for key, value in input.facts.items())
        started = time.monotonic()
        try:
            payload, response = self._generate(
                contents=(
                    f"Allowed source IDs: {', '.join(input.source_ids)}\n"
                    f"Language: {input.language}\n"
                    f"Confirmed facts:\n{facts or '(none)'}\n\n"
                    f"Approved text:\n{input.approved_text}"
                ),
                system_instruction=(
                    "Summarize only the approved text and confirmed facts. Use only the "
                    "supplied source IDs; put conflicts or missing facts in uncertainties."
                ),
                schema=SummaryPayload,
                max_output_tokens=input.max_output_tokens,
            )
            invalid_ids = set(payload.source_ids) - set(input.source_ids)
            if invalid_ids:
                raise ValueError("Provider returned source IDs that were not supplied")
            input_tokens, output_tokens = self._token_counts(response)
            return SummarizeResult(
                provider=self.provider_name,
                model=self.model,
                latency_ms=int((time.monotonic() - started) * 1000),
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                provider_request_id=getattr(response, "response_id", None),
                **payload.model_dump(),
            )
        except Exception as exc:
            return self._map_exception(exc)

    def summarize_case(
        self,
        *,
        contents: str,
        max_output_tokens: int,
        pdf_sources: list[dict] | None = None,
        structured: bool = False,
        deadline_seconds: int | None = None,
    ) -> tuple[CaseSummaryPayload | BaseModel, int | None, int | None, str | None] | ProviderError:
        """Generate one validated, unreviewed legal summary from a bounded manifest."""
        from app.features.summaries.structured import StructuredSummary, UnverifiedSummary
        from app.features.summaries.prompt import STRUCTURED_INSTRUCTION
        request_id = None
        usage: dict[str, Any] = {}
        text = ""
        started = time.monotonic()
        schema = StructuredSummary if structured else CaseSummaryPayload
        try:
            instruction = STRUCTURED_INSTRUCTION if structured else SIMPLE_INSTRUCTION
            if not structured:
                instruction += (
                    "\nAllowed section name values: "
                    + ", ".join(item.value for item in SummarySectionName)
                    + ".\nAllowed finding_type values: "
                    + ", ".join(item.value for item in FindingType)
                    + ". Use these exact labels; cite only supplied sources."
                )
            if structured:
                prompt_schema = schema.model_json_schema()
                # Don't expose additional_sections in the prompt – it is a
                # server-side capture field, not a generation target.
                prompt_schema.get("properties", {}).pop("additional_sections", None)
                req = prompt_schema.get("required")
                if isinstance(req, list) and "additional_sections" in req:
                    req.remove("additional_sections")
                instruction += (
                    "\nRequired nested JSON shape; every field named here must be present. "
                    "Do not treat this as a source of case facts:\n"
                    + json.dumps(
                        prompt_schema,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )
            request = _summary_request(
                contents=contents,
                pdf_sources=pdf_sources,
                system_instruction=instruction,
                schema=schema,
                max_output_tokens=max_output_tokens,
            )
            logger.info(
                "Gemini summary request: format=%s pdf_count=%s pdf_bytes=%s max_output_tokens=%s",
                "v2-json-mode" if structured else "concise-shape-v1",
                len(pdf_sources or []),
                sum(len(item["data"]) for item in pdf_sources or []),
                max_output_tokens,
            )
            model = self.model.removeprefix("models/")
            timeout = httpx.Timeout(
                connect=10.0,
                write=120.0,
                read=float(min(settings.GEMINI_SUMMARY_READ_TIMEOUT_SECONDS,
                               deadline_seconds or settings.GEMINI_SUMMARY_READ_TIMEOUT_SECONDS)),
                pool=10.0,
            )
            with httpx.Client(timeout=timeout) as client:
                response = client.post(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
                    headers={"x-goog-api-key": settings.GEMINI_API_KEY},
                    json=request,
                )
            if response.is_error:
                _log_summary_http_error(response)
                errors.APIError.raise_for_response(response)
            body = response.json()
            request_id = body.get("responseId")
            candidates = body.get("candidates") or []
            candidate = candidates[0] if candidates else {}
            finish = candidate.get("finishReason")
            usage = body.get("usageMetadata") or {}
            logger.info(
                "Gemini summary response: finish=%s input_tokens=%s output_tokens=%s "
                "thinking_tokens=%s elapsed_ms=%s request_id=%s",
                finish if finish in {"STOP", "MAX_TOKENS", "SAFETY", "RECITATION", "OTHER"} else "OTHER",
                usage.get("promptTokenCount"), usage.get("candidatesTokenCount"),
                usage.get("thoughtsTokenCount"), int((time.monotonic() - started) * 1000),
                request_id,
            )
            text = "".join(
                part.get("text", "")
                for part in candidate.get("content", {}).get("parts", [])
                if isinstance(part, dict) and not part.get("thought")
                and isinstance(part.get("text"), str)
            )
            if not text.strip() and usage.get("candidatesTokenCount"):
                # Fallback: include all text parts when thought-filter removed everything
                text = "".join(
                    part.get("text", "")
                    for part in candidate.get("content", {}).get("parts", [])
                    if isinstance(part, dict) and isinstance(part.get("text"), str)
                )
            if finish == "MAX_TOKENS" and text.strip():
                return (UnverifiedSummary(raw_text=text, reason="incomplete_output"),
                        usage.get("promptTokenCount"), usage.get("candidatesTokenCount"), request_id)
            if finish != "STOP":
                return ProviderError(
                    provider=self.provider_name,
                    error_code=(ProviderErrorCode.safety_block if finish == "SAFETY"
                                else ProviderErrorCode.invalid_response),
                    message="The provider did not return a complete summary.",
                    retryable=False,
                    provider_request_id=request_id,
                    input_tokens=usage.get("promptTokenCount"),
                    output_tokens=usage.get("candidatesTokenCount"),
                )
            payload = _validate_summary_response(text, schema)
            return (
                payload,
                usage.get("promptTokenCount"),
                usage.get("candidatesTokenCount"),
                request_id,
            )
        except ValidationError as exc:
            logger.warning(
                "Gemini summary validation failed: count=%s issues=%s request_id=%s",
                exc.error_count(), _summary_validation_issues(exc, schema), request_id,
            )
            if text.strip():
                return (UnverifiedSummary(raw_text=text, reason="invalid_format"),
                        usage.get("promptTokenCount"), usage.get("candidatesTokenCount"), request_id)
            return self._map_exception(exc).model_copy(update={
                "provider_request_id": request_id,
                "input_tokens": usage.get("promptTokenCount"),
                "output_tokens": usage.get("candidatesTokenCount"),
            })
        except Exception as exc:
            return self._map_exception(exc).model_copy(update={"provider_request_id": request_id})

    def draft(self, input: DraftInput) -> DraftResult | ProviderError:
        facts = "\n".join(
            f"- {key}: {value}" for key, value in input.approved_facts.items()
        )
        started = time.monotonic()
        try:
            payload, response = self._generate(
                contents=(
                    f"Template: {input.template_name}\n"
                    f"Source IDs: {', '.join(input.source_ids) or '(none)'}\n"
                    f"Instructions: {input.instructions}\n"
                    f"Approved facts:\n{facts or '(none)'}"
                ),
                system_instruction=(
                    "Draft from the selected template and approved facts only. Never invent "
                    "a missing fact; list every required missing fact in missing_facts."
                ),
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
                provider_request_id=getattr(response, "response_id", None),
                sections=payload.sections,
                missing_facts=payload.missing_facts,
            )
        except Exception as exc:
            return self._map_exception(exc)

    def generate_court_draft_prose(
        self,
        *,
        summary: dict[str, Any],
        slots: list[str],
        max_output_tokens: int,
        affidavit_findings: list[dict[str, Any]] | None = None,
    ) -> tuple[dict[str, Any], int | None, int | None, str | None] | ProviderError:
        """Generate only affidavit narrative paragraphs from one approved summary.

        Court rules, document assembly, the application body, prayer, and all
        surrounding boilerplate remain deterministic.  The LLM writes only the
        affidavit narrative paragraphs (one per cited finding).  The dynamically-
        created schema makes the provider return exactly the requested prose slots;
        it never receives a way to choose sections or alter the court template.
        """
        if slots and len(set(slots)) != len(slots):
            raise ValueError("Court draft generation requires unique prose slots")
        if not slots and not affidavit_findings:
            raise ValueError("Court draft generation requires prose slots or affidavit findings")
        fields: dict[str, tuple[Any, Any]] = {slot: (str, ...) for slot in slots}
        if affidavit_findings:
            paragraph_schema = create_model(
                "CitedAffidavitParagraph", __config__=ConfigDict(extra="forbid"),
                finding_id=(str, ...), text=(str, ...),
            )
            fields["affidavit_paragraphs"] = (list[paragraph_schema], ...)
        section_schema = create_model(
            "CourtDraftProse",
            __config__=ConfigDict(extra="forbid"),
            **fields,
        )
        try:
            payload, response = self._generate(
                contents=(
                    (("Requested slots: " + json.dumps(slots) + "\n") if slots else "")
                    + "Verified summary:\n" + json.dumps(summary, ensure_ascii=False)
                    + ("\nAffidavit findings, in required order:\n" + json.dumps(
                        [{key: finding[key] for key in ("id", "section", "text", "status")}
                         for finding in affidavit_findings], ensure_ascii=False
                    ) if affidavit_findings else "")
                ),
                system_instruction=(
                    "Write only the affidavit narrative paragraphs for an Allahabad High Court "
                    "regular-bail application under Section 483 BNSS. "
                    "All structural boilerplate, the application body, prayer, and cause title are "
                    "deterministic — do not write them. "
                    "Use only the verified summary supplied. "
                    "Do not invent names, dates, facts, procedural history, law, citations, "
                    "or authorities. If evidence is missing, write [● lawyer confirm karein ●]. "
                    "For affidavit_paragraphs, write exactly one paragraph of formal legal prose "
                    "for each supplied finding, in the same order, returning its exact finding_id. "
                    "Each paragraph must be in formal legal language suitable for Allahabad High Court — "
                    "no headings, no Markdown, no numbering prefix (the system adds the number). "
                    "Retain allegation/dispute/record status; never turn an allegation into a proven fact. "
                    "Do not invent deponent knowledge, prior bail history, criminal history, "
                    "document dates, legal authorities, or a citation not present in the source."
                ),
                schema=section_schema,
                max_output_tokens=max_output_tokens,
            )
            prose = {slot: str(getattr(payload, slot)).strip() for slot in slots}
            if affidavit_findings:
                prose["affidavit_paragraphs"] = [
                    item.model_dump() for item in payload.affidavit_paragraphs
                ]
            if any(not text or len(text) > 20_000 for text in prose.values()):
                raise ValueError("Provider returned invalid court-draft prose")
            input_tokens, output_tokens = self._token_counts(response)
            return prose, input_tokens, output_tokens, getattr(response, "response_id", None)
        except Exception as exc:
            return self._map_exception(exc)
