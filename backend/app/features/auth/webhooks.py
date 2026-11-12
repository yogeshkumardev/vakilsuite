"""Resend delivery webhook: signed, deduplicated, never an identity proof."""
import base64
import hashlib
import hmac
import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError
from app.db.session import get_db
from app.features.auth.models import AuthEmailOutbox, AuthWebhookEvent

router = APIRouter(prefix="/webhooks", tags=["Auth webhooks"])
_MAX_BODY = 64 * 1024


def _verify_signature(raw: bytes, message_id: str | None, timestamp: str | None, signature: str | None) -> bool:
    if not settings.RESEND_WEBHOOK_SECRET or not message_id or not timestamp or not signature:
        return False
    try:
        secret = settings.RESEND_WEBHOOK_SECRET.removeprefix("whsec_")
        key = base64.b64decode(secret + "===")
        expected = base64.b64encode(hmac.new(key, f"{message_id}.{timestamp}.".encode() + raw, hashlib.sha256).digest()).decode()
        return any(hmac.compare_digest(part.removeprefix("v1,"), expected) for part in signature.split(" "))
    except Exception:
        return False


@router.post("/resend", status_code=204, operation_id="auth_resend_webhook")
async def resend_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    raw = await request.body()
    if len(raw) > _MAX_BODY:
        raise AppError("Webhook payload too large", "WEBHOOK_INVALID", 413)
    if not _verify_signature(raw, request.headers.get("svix-id"), request.headers.get("svix-timestamp"), request.headers.get("svix-signature")):
        raise AppError("Invalid webhook signature", "WEBHOOK_INVALID", 401)
    try:
        payload = json.loads(raw)
        event_id, event_type = request.headers["svix-id"], str(payload["type"])
    except (KeyError, ValueError, TypeError):
        raise AppError("Invalid webhook payload", "WEBHOOK_INVALID", 422)
    try:
        db.add(AuthWebhookEvent(event_id=event_id, event_type=event_type))
        await db.flush()
    except IntegrityError:
        await db.rollback()
        return None
    data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
    provider_id = data.get("email_id")
    if isinstance(provider_id, str) and event_type in {"email.delivered", "email.bounced", "email.complained"}:
        outbox = await db.scalar(select(AuthEmailOutbox).where(AuthEmailOutbox.provider_message_id == provider_id).with_for_update())
        if outbox and event_type in {"email.bounced", "email.complained"}:
            outbox.status = "suppressed"
            outbox.last_error_code = event_type.upper().replace(".", "_")
    await db.commit()
    return None
