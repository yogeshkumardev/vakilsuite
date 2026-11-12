import time
import logging
import hashlib
import re
from typing import Optional

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import decode_access_token

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────
# Only explicit provider actions consume this quota. Inspection, status polling,
# autosave, human review and original-file operations never invoke a model.
AI_ACTION_PATHS = re.compile(
    r"^/api/v1/(?:"
    r"documents/[^/]+/(?:summary-source/ocr(?:-quote)?|extractions)"
    r"|cases/[^/]+/summary-runs/[^/]+/submit"
    r"|cases/[^/]+/okf-contexts/[^/]+/draft-(?:quote|generation)"
    r"|cases/[^/]+/legal-research/(?:runs/[^/]+/submit|authorities/[^/]+/checks)"
    r"|dictation/transcriptions"
    r")/?$"
)

MAX_AI_CALLS_PER_HOUR = 30
WINDOW_SECONDS = 3600


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────
def _is_rate_limited_path(path: str) -> bool:
    return AI_ACTION_PATHS.fullmatch(path) is not None


def _extract_token(request: Request) -> Optional[str]:
    auth = request.headers.get("Authorization")
    if auth and auth.startswith("Bearer "):
        return auth.removeprefix("Bearer ")
    return None


def _get_user_identifier(token: str) -> str:
    """
    Prefer user_id from JWT.
    Fallback to hashed token.
    """
    payload = decode_access_token(token)
    if payload and payload.get("sub"):
        return f"user:{payload['sub']}"

    # fallback (should rarely happen)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return f"token:{token_hash}"


# ─────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────
class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.redis = None

    async def _get_redis(self):
        if not self.redis:
            self.redis = aioredis.from_url(settings.REDIS_URL)
        return self.redis

    async def dispatch(self, request: Request, call_next):
        # Only POST requests (AI-heavy endpoints)
        if request.method != "POST":
            return await call_next(request)

        if not _is_rate_limited_path(request.url.path):
            return await call_next(request)

        token = _extract_token(request)
        if not token:
            return await call_next(request)

        user_key = _get_user_identifier(token)

        # rolling window bucket
        current_window = int(time.time() // WINDOW_SECONDS)
        redis_key = f"rate_limit:ai_actions_v2:{user_key}:{current_window}"

        try:
            r = await self._get_redis()

            current = await r.incr(redis_key)

            if current == 1:
                await r.expire(redis_key, WINDOW_SECONDS)

            if current > MAX_AI_CALLS_PER_HOUR:
                logger.warning(
                    f"Rate limit exceeded for {user_key} on {request.url.path}"
                )
                retry_after = max(1, WINDOW_SECONDS - int(time.time()) % WINDOW_SECONDS)
                # Middleware sits outside FastAPI's exception handlers: return an
                # envelope here instead of raising an HTTPException (which becomes 500).
                return JSONResponse(
                    status_code=429,
                    headers={"Retry-After": str(retry_after)},
                    content={"success": False, "error": {
                        "code": "AI_RATE_LIMITED",
                        "message": "Processing is busy. Please wait before starting another AI request. You can still view, edit and review documents.",
                        "details": {"retry_after_seconds": retry_after},
                    }},
                )

        except Exception as e:
            # Fail open (never block users if Redis fails)
            logger.error("Rate limiter unavailable: %s", type(e).__name__)

        return await call_next(request)
