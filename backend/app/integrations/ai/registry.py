"""Explicit provider factory; cross-provider fallback is intentionally absent."""

from app.core.config import settings
from app.integrations.ai.contracts import AIProvider, ProviderName


def get_provider(name: ProviderName, model: str | None = None) -> AIProvider:
    if name == ProviderName.gemini:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY is not configured")
        from app.integrations.ai.gemini import GeminiAdapter

        return GeminiAdapter(model=model)

    if name == ProviderName.openai:
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")
        from app.integrations.ai.openai import OpenAIAdapter

        return OpenAIAdapter(model=model)

    raise ValueError(f"Unknown provider name: {name!r}")
