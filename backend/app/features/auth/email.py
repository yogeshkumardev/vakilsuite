import asyncio
import smtplib
import ssl
from email.message import EmailMessage

import httpx

from app.core.config import settings
from app.core.exceptions import AppError


def require_email_delivery():
    if settings.AUTH_EMAIL_PROVIDER == "resend" and settings.RESEND_API_KEY and settings.AUTH_EMAIL_FROM:
        return
    if settings.AUTH_EMAIL_PROVIDER == "smtp" and settings.SMTP_HOST and settings.SMTP_FROM:
        return
    raise AppError("Email delivery is temporarily unavailable. Please try again later.", "EMAIL_UNAVAILABLE", 503)


async def send_auth_code(email: str, code: str, purpose: str, *, idempotency_key: str | None = None):
    require_email_delivery()
    action = "verify your VakilSuite email address" if purpose == "email_verification" else "reset your VakilSuite password"
    subject = f"VakilSuite security code: {code}"
    text = f"Your code to {action} is: {code}\n\nThis code expires in 10 minutes and can only be used once. Never share this code."
    if settings.AUTH_EMAIL_PROVIDER == "resend":
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {settings.RESEND_API_KEY}", "Idempotency-Key": idempotency_key or "auth-email"},
                json={"from": settings.AUTH_EMAIL_FROM, "to": [email], "subject": subject, "text": text},
            )
        if response.status_code >= 400:
            raise AppError("Email delivery is temporarily unavailable. Please try again later.", "EMAIL_UNAVAILABLE", 503)
        return response.json().get("id")
    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.SMTP_FROM
    message["To"] = email
    message.set_content(text)

    def deliver():
        transport = smtplib.SMTP_SSL if settings.SMTP_SSL else smtplib.SMTP
        options = {"context": ssl.create_default_context()} if settings.SMTP_SSL else {}
        with transport(
            settings.SMTP_HOST, settings.SMTP_PORT, timeout=15, **options
        ) as smtp:
            if settings.SMTP_STARTTLS and not settings.SMTP_SSL:
                smtp.starttls(context=ssl.create_default_context())
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)

    await asyncio.to_thread(deliver)
    return None
