import hashlib
import json
import time

import redis.asyncio as redis
from fastapi import Request

from app.core.config import settings
from app.core.exceptions import AppError, ForbiddenError

_redis = redis.from_url(settings.REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
_fallback: dict[str, tuple[int, int]] = {}
_public_paths = {"login", "register", "google", "forgot-password", "reset-password", "request", "confirm"}


async def guard_auth_request(request: Request):
    if request.method not in {"POST", "DELETE", "PATCH"}:
        return
    origin = request.headers.get("origin")
    if origin and origin not in settings.CORS_ORIGINS:
        raise ForbiddenError("Untrusted request origin")
    if request.url.path.rsplit("/", 1)[-1] not in _public_paths:
        return
    # Trust only the ASGI peer; forwarded headers must be handled by a trusted proxy.
    peer = request.client.host if request.client else "unknown"
    window = int(time.time() // 300)
    key = f"auth-rate:{hashlib.sha256(peer.encode()).hexdigest()}:{window}"
    account_key = None
    try:
        payload = json.loads((await request.body()) or b"{}")
        email = payload.get("email") if isinstance(payload, dict) else None
        if isinstance(email, str) and email:
            account_key = f"auth-account-rate:{hashlib.sha256(email.strip().lower().encode()).hexdigest()}:{window}"
    except (ValueError, UnicodeDecodeError, RuntimeError):
        pass
    try:
        async with _redis.pipeline(transaction=True) as pipeline:
            pipeline.incr(key)
            pipeline.expire(key, 300)
            if account_key:
                pipeline.incr(account_key)
                pipeline.expire(account_key, 300)
            values = await pipeline.execute()
            count = values[0]
            account_count = values[2] if account_key else 0
    except redis.RedisError:
        if settings.APP_ENV == "production":
            raise AppError(
                "Sign-in is temporarily unavailable. Try again shortly.",
                "AUTH_UNAVAILABLE",
                503,
            )
        if len(_fallback) > 10000:
            _fallback.clear()
        previous_window, count = _fallback.get(peer, (window, 0))
        count = count + 1 if previous_window == window else 1
        _fallback[peer] = (window, count)
        account_count = 0
        if account_key:
            previous_window, account_count = _fallback.get(account_key, (window, 0))
            account_count = account_count + 1 if previous_window == window else 1
            _fallback[account_key] = (window, account_count)
    if count > 30 or account_count > 10:
        raise AppError(
            "Too many attempts. Try again in 5 minutes.", "RATE_LIMITED", 429
        )
