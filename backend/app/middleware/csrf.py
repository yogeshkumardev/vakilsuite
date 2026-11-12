from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import settings


class CookieCsrfMiddleware(BaseHTTPMiddleware):
    """Unsafe browser requests with automatic cookies need a trusted Origin."""
    async def dispatch(self, request, call_next):
        cookie = request.headers.get("cookie", "")
        if request.method in {"POST", "PUT", "PATCH", "DELETE"} and ("access_token=" in cookie or "refresh_token=" in cookie):
            if request.headers.get("origin") not in settings.CORS_ORIGINS:
                return JSONResponse(status_code=403, content={"success": False, "error": {"code": "CSRF_REJECTED", "message": "Untrusted browser request", "details": {}}})
        return await call_next(request)
