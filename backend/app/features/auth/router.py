from app.core.api_responses import (
    ERROR_RESPONSES, SuccessResponse, AuthData, RefreshData, EmptyData, SessionsData, MessageData,
)
import uuid

from fastapi import APIRouter, Body, Cookie, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.config import settings
from app.db.session import get_db
from app.features.auth.schemas import (
    ChangePasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    RegisterRequest,
    EmailRequest,
    ResetPasswordRequest,
    SessionResponse,
    VerificationRequest,
    VerificationConfirmRequest,
    VerificationPendingResponse,
)
from app.features.auth.service import AuthService
from app.features.auth.models import AuthDeviceType
from app.features.auth.recovery import RecoveryService
from app.features.auth.guards import guard_auth_request

router = APIRouter(
    prefix="/auth", tags=["Auth"], dependencies=[Depends(guard_auth_request)]
)

_ACCESS_MAX_AGE = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
_REFRESH_MAX_AGE = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600


def _cookie_options() -> dict:
    opts = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "path": "/",
    }
    if settings.COOKIE_DOMAIN:
        opts["domain"] = settings.COOKIE_DOMAIN
    return opts


def _set_auth_cookies(response: Response, access: str, refresh: str):
    cookie_opts = _cookie_options()
    response.set_cookie("access_token", access, max_age=_ACCESS_MAX_AGE, **cookie_opts)
    response.set_cookie(
        "refresh_token", refresh, max_age=_REFRESH_MAX_AGE, **cookie_opts
    )


def _clear_auth_cookies(response: Response):
    delete_opts = {"path": "/"}
    if settings.COOKIE_DOMAIN:
        delete_opts["domain"] = settings.COOKIE_DOMAIN
    response.delete_cookie("access_token", **delete_opts)
    response.delete_cookie("refresh_token", **delete_opts)


def _client_ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _device_kwargs(body, request: Request) -> dict:
    return {
        "device_type": body.device_type,
        "device_name": body.device_name,
        "device_id": body.device_id,
        "user_agent": request.headers.get("user-agent", "")[:500],
        "ip_address": _client_ip(request),
    }


def _auth_response(result, body, response):
    data = dict(result["public_data"])
    if body.device_type not in (AuthDeviceType.android, AuthDeviceType.ios):
        _set_auth_cookies(response, result["access_token"], result["refresh_token"])
        data.pop("refresh_token", None)
    response.headers["Cache-Control"] = "no-store"
    return {"success": True, "data": data}


@router.post("/register", status_code=202, response_model=SuccessResponse[VerificationPendingResponse], operation_id="auth_register", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.register(
        body.email,
        body.password,
        body.full_name,
        **_device_kwargs(body, request),
    )
    return {"success": True, "data": result}


@router.post("/email-verification/request", status_code=202, response_model=SuccessResponse[VerificationPendingResponse], operation_id="auth_request_email_verification", responses=ERROR_RESPONSES)
async def request_email_verification(body: VerificationRequest, db: AsyncSession = Depends(get_db)):
    flow = await RecoveryService(db).issue(str(body.email), "email_verification", expose_flow=True)
    return {"success": True, "data": {"status": "verification_pending", "verification_flow": flow, "message": "If this account is eligible, a verification code is being sent."}}


@router.post("/email-verification/confirm", response_model=SuccessResponse[MessageData], operation_id="auth_confirm_email_verification", responses=ERROR_RESPONSES)
async def confirm_email_verification(body: VerificationConfirmRequest, db: AsyncSession = Depends(get_db)):
    await RecoveryService(db).verify_email(body.flow, body.code)
    return {"success": True, "data": {"message": "Email verified. You can now sign in."}}


@router.post("/login", response_model=SuccessResponse[AuthData], operation_id="auth_login", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.login(body.email, body.password, **_device_kwargs(body, request))
    return _auth_response(result, body, response)


@router.post("/login/google", response_model=SuccessResponse[AuthData], operation_id="auth_login_google", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def login_google(
    body: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.login_with_google(body.id_token, **_device_kwargs(body, request))
    return _auth_response(result, body, response)


@router.post("/google", response_model=SuccessResponse[AuthData], operation_id="auth_google_alias", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def google(
    body: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    return await login_google(body, request, response, db)


@router.post("/refresh", response_model=SuccessResponse[RefreshData], operation_id="auth_refresh", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def refresh(
    response: Response,
    body: RefreshTokenRequest | None = Body(None),
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    token = body.refresh_token if body and body.refresh_token else refresh_token
    result = await svc.refresh(token)
    native = bool(body and body.refresh_token)
    if not native:
        _set_auth_cookies(response, result["access_token"], result["refresh_token"])
    response.headers["Cache-Control"] = "no-store"
    return {
        "success": True,
        "data": {
            "access_token": result["access_token"],
            **({"refresh_token": result["refresh_token"]} if native else {}),
            "token_type": "bearer",
            "session_id": result["session_id"],
        },
    }


@router.post("/change-password", response_model=SuccessResponse[EmptyData], operation_id="auth_change_password", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def change_password(
    body: ChangePasswordRequest,
    response: Response,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    await svc.change_password(user.id, body.current_password, body.new_password)
    _clear_auth_cookies(response)
    return {"success": True, "data": {}}


@router.post("/logout", response_model=SuccessResponse[EmptyData], operation_id="auth_logout", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def logout(
    response: Response,
    body: LogoutRequest | None = Body(None),
    refresh_token: str | None = Cookie(None),
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    token = body.refresh_token if body and body.refresh_token else refresh_token
    await svc.logout(token)
    _clear_auth_cookies(response)
    return {"success": True, "data": {}}


@router.post("/logout-all", response_model=SuccessResponse[EmptyData], operation_id="auth_logout_all", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def logout_all(
    response: Response,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    await svc.logout_all(user.id)
    _clear_auth_cookies(response)
    return {"success": True, "data": {}}


@router.get("/sessions", response_model=SuccessResponse[SessionsData], operation_id="auth_sessions", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def list_sessions(
    user: CurrentUser, response: Response, db: AsyncSession = Depends(get_db)
):
    response.headers["Cache-Control"] = "no-store"
    sessions = await AuthService(db).list_sessions(user.id)
    return {
        "success": True,
        "data": {
            "sessions": [
                SessionResponse.model_validate(s).model_dump() for s in sessions
            ]
        },
    }


@router.delete("/sessions/{session_id}", response_model=SuccessResponse[EmptyData], operation_id="auth_revoke_session", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def revoke_session(
    session_id: uuid.UUID, user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    await AuthService(db).revoke_session(user.id, session_id)
    return {"success": True, "data": {}}


@router.post("/forgot-password", response_model=SuccessResponse[MessageData], operation_id="auth_forgot_password", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def forgot_password(body: EmailRequest, db: AsyncSession = Depends(get_db)):
    await RecoveryService(db).issue(str(body.email), "password_reset")
    return {
        "success": True,
        "data": {
            "message": "If this account is eligible, a code has been sent. Check your inbox and spam folder."
        },
    }


@router.post("/reset-password", response_model=SuccessResponse[MessageData], operation_id="auth_reset_password", responses=ERROR_RESPONSES, response_model_exclude_unset=True)
async def reset_password(
    body: ResetPasswordRequest, response: Response, db: AsyncSession = Depends(get_db)
):
    await RecoveryService(db).reset_password(
        str(body.email), body.code, body.new_password
    )
    _clear_auth_cookies(response)
    return {
        "success": True,
        "data": {"message": "Password reset. Sign in with your new password."},
    }
