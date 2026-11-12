import uuid
import logging
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.exceptions import (
    AuthInvalidError,
    ConflictError,
    ForbiddenError,
    EmailVerificationRequiredError,
    AccountLinkingRequiredError,
    NotFoundError,
    ValidationError,
)
from app.core.security import (
    create_access_token,
    create_session_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expires_at,
    verify_password,
    verify_password_and_upgrade,
)
from app.core.config import settings
from app.features.auth.models import AuthDeviceType, AuthSession, SpentRefreshToken
from app.features.chambers.service import provision_personal_chamber
from app.features.users.models import AuthProvider
from app.features.users.repository import UserRepository
from app.features.users.schemas import LawyerProfileResponse

logger = logging.getLogger(__name__)
_DUMMY_PASSWORD_HASH = hash_password("vakilsuite-nonexistent-account")


class AuthService:
    def __init__(self, db: AsyncSession):
        self.repo = UserRepository(db)
        self.db = db

    # ─────────────────────────────────────────────
    # Register
    # ─────────────────────────────────────────────
    def _serialize_user(self, user) -> dict:
        return LawyerProfileResponse.model_validate(user).model_dump(mode="json")

    def _normalize_device_type(
        self, device_type: AuthDeviceType | None
    ) -> AuthDeviceType:
        return device_type or AuthDeviceType.web

    async def _create_session(
        self,
        user,
        *,
        device_type: AuthDeviceType | None = None,
        device_name: str | None = None,
        device_id: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> tuple[AuthSession, str]:
        refresh_token = create_session_refresh_token()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        session = AuthSession(
            user_id=user.id,
            refresh_token_hash=hash_refresh_token(refresh_token),
            device_type=self._normalize_device_type(device_type),
            device_name=device_name,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
            last_seen_at=now,
            expires_at=refresh_token_expires_at(),
        )
        self.db.add(session)
        await self.db.flush()
        return session, refresh_token

    async def _auth_result(
        self,
        user,
        *,
        device_type: AuthDeviceType | None = None,
        device_name: str | None = None,
        device_id: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        session, refresh_token = await self._create_session(
            user,
            device_type=device_type,
            device_name=device_name,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )
        access_token = create_access_token(user.id, user.role.value, session.id)
        await self.db.commit()
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session.id,
            "public_data": {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "session_id": session.id,
                "user": self._serialize_user(user),
            },
        }

    async def register(
        self,
        email: str,
        password: str,
        full_name: str,
        *,
        device_type: AuthDeviceType | None = None,
        device_name: str | None = None,
        device_id: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        normalized_email = email.strip().lower()
        existing = await self.repo.get_by_email(normalized_email)
        if existing:
            raise ConflictError("Email already registered")

        try:
            user = await self.repo.create(
                email=normalized_email,
                full_name=full_name.strip(),
                hashed_password=await run_in_threadpool(hash_password, password),
                auth_provider=AuthProvider.email,
                is_email_verified=False,
            )
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()
            raise ConflictError("Email already registered")

        logger.info(f"User registered: {user.id}")

        # A password account is deliberately inert until mailbox ownership is
        # proven.  The verification service provisions its chamber later.
        from app.features.auth.recovery import RecoveryService
        flow = await RecoveryService(self.db).issue(user.email, "email_verification", expose_flow=True)
        return {"verification_flow": flow, "status": "verification_pending"}

    # ─────────────────────────────────────────────
    # Login
    # ─────────────────────────────────────────────
    async def login(
        self,
        email: str,
        password: str,
        *,
        device_type: AuthDeviceType | None = None,
        device_name: str | None = None,
        device_id: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        normalized_email = email.strip().lower()
        user = await self.repo.get_by_email(normalized_email)

        valid_password, upgraded_hash = await run_in_threadpool(
            verify_password_and_upgrade,
            password,
            user.hashed_password if user and user.hashed_password else _DUMMY_PASSWORD_HASH,
        )
        if not user or not user.hashed_password or not valid_password:
            logger.warning("Login failed: wrong password")
            raise AuthInvalidError("Invalid email or password")

        if not user.is_active:
            raise ForbiddenError("Account is deactivated")
        if not user.is_email_verified:
            raise EmailVerificationRequiredError()
        if upgraded_hash:
            user.hashed_password = upgraded_hash

        user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.commit()

        logger.info(f"User login: {user.id}")

        return await self._auth_result(
            user,
            device_type=device_type,
            device_name=device_name,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )

    async def _get_active_session(self, refresh_token: str) -> AuthSession | None:
        token_hash = hash_refresh_token(refresh_token)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.refresh_token_hash == token_hash,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .with_for_update()
        )
        return result.scalar_one_or_none()

    async def _rotate_session(self, session: AuthSession, user) -> dict:
        previous_hash = session.refresh_token_hash
        refresh_token = create_session_refresh_token()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        session.refresh_token_hash = hash_refresh_token(refresh_token)
        self.db.add(SpentRefreshToken(session_id=session.id, token_hash=previous_hash, expires_at=session.expires_at))
        session.last_seen_at = now
        access_token = create_access_token(user.id, user.role.value, session.id)
        await self.db.commit()
        logger.info("Token refreshed: %s session=%s", user.id, session.id)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "session_id": session.id,
        }

    # ─────────────────────────────────────────────
    # Refresh
    # ─────────────────────────────────────────────
    async def refresh(self, refresh_token: str | None) -> dict:
        if not refresh_token:
            raise AuthInvalidError("Invalid or expired refresh token")

        session = await self._get_active_session(refresh_token)
        if session:
            user = await self.repo.get_by_id(session.user_id)
            if not user or not user.is_active:
                raise AuthInvalidError("User not found or deactivated")
            if not user.is_email_verified:
                raise EmailVerificationRequiredError()
            return await self._rotate_session(session, user)

        # A reused rotated token is evidence of refresh-token replay. Revoke
        # its session before returning the same safe invalid-token response.
        spent = await self.db.scalar(select(SpentRefreshToken).where(SpentRefreshToken.token_hash == hash_refresh_token(refresh_token)))
        if spent:
            replay_session = await self.db.get(AuthSession, spent.session_id, with_for_update=True)
            if replay_session and replay_session.revoked_at is None:
                replay_session.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
                await self.db.commit()

        # Stateless legacy refresh tokens cannot be revoked. Require re-login.
        raise AuthInvalidError("Invalid or expired refresh token")

    async def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return

        session = await self._get_active_session(refresh_token)
        if session:
            session.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
            await self.db.commit()

    async def logout_all(self, user_id: uuid.UUID) -> None:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.execute(
            update(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
            )
            .values(revoked_at=now)
        )
        await self.db.commit()

    async def list_sessions(self, user_id: uuid.UUID):
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.user_id == user_id,
                AuthSession.revoked_at.is_(None),
                AuthSession.expires_at > now,
            )
            .order_by(AuthSession.last_seen_at.desc())
        )
        return result.scalars().all()

    async def revoke_session(self, user_id: uuid.UUID, session_id: uuid.UUID):
        result = await self.db.execute(
            select(AuthSession)
            .where(
                AuthSession.id == session_id,
                AuthSession.user_id == user_id,
            )
            .with_for_update()
        )
        session = result.scalar_one_or_none()
        if not session:
            raise NotFoundError("Session not found")
        session.revoked_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.commit()

    # ─────────────────────────────────────────────
    # Change Password
    # ─────────────────────────────────────────────
    async def change_password(
        self, user_id: uuid.UUID, current_password: str, new_password: str
    ) -> None:
        user = await self.repo.get_by_id(user_id)
        if not user:
            raise AuthInvalidError()

        if not user.hashed_password:
            raise ValidationError("Google account cannot change password")

        if not await run_in_threadpool(
            verify_password, current_password, user.hashed_password
        ):
            raise ValidationError("Current password is incorrect")

        await self.repo.update_password(
            user, await run_in_threadpool(hash_password, new_password)
        )
        await self.logout_all(user.id)
        logger.info(f"Password changed: {user.id}")

    # ─────────────────────────────────────────────
    # Google Login
    # ─────────────────────────────────────────────
    async def login_with_google(
        self,
        token: str,
        *,
        device_type: AuthDeviceType | None = None,
        device_name: str | None = None,
        device_id: str | None = None,
        user_agent: str | None = None,
        ip_address: str | None = None,
    ) -> dict:
        if not settings.GOOGLE_CLIENT_ID:
            raise AuthInvalidError("Google login is not configured")

        try:
            id_info = id_token.verify_oauth2_token(
                token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID,
                clock_skew_in_seconds=10,
            )
        except Exception:
            raise AuthInvalidError("Invalid Google token")

        email = (id_info.get("email") or "").strip().lower()
        provider_id = id_info.get("sub")
        if not email:
            raise ValidationError("Email not provided by Google")
        if not provider_id:
            raise AuthInvalidError("Invalid Google token")
        if id_info.get("email_verified") is not True:
            raise AuthInvalidError("Google email must be verified")

        provider_user = await self.repo.get_by_provider_id(provider_id)
        if provider_user and provider_user.email.lower() != email:
            raise ConflictError("Google account is already linked to another user")

        user = await self.repo.get_by_email(email)

        if not user:
            user = await self.repo.create(
                email=email,
                full_name=(id_info.get("name") or "Unknown").strip(),
                hashed_password=None,
                auth_provider=AuthProvider.google,
                provider_id=provider_id,
                is_email_verified=bool(id_info.get("email_verified", True)),
            )
            await provision_personal_chamber(self.db, user=user)
        elif user.provider_id and user.provider_id != provider_id:
            raise ConflictError("Email is already linked to a different Google account")

        if not user.is_active:
            raise ForbiddenError("Account is deactivated")

        if not user.provider_id:
            # Do not silently attach Google ownership to a same-email password
            # account. That is an account-pre-hijacking edge.
            raise AccountLinkingRequiredError()

        user.last_login_at = datetime.now(timezone.utc).replace(tzinfo=None)
        await self.db.commit()

        logger.info(f"Google login: {user.id}")

        return await self._auth_result(
            user,
            device_type=device_type,
            device_name=device_name,
            device_id=device_id,
            user_agent=user_agent,
            ip_address=ip_address,
        )
