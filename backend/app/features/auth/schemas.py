import uuid
from datetime import datetime
from typing import Annotated

from pydantic import (
    BaseModel,
    EmailStr,
    Field,
    ConfigDict,
    field_validator,
    AfterValidator,
)

from app.features.auth.models import AuthDeviceType
from app.features.users.schemas import LawyerProfileResponse


def validate_password(value: str) -> str:
    if len(value.encode("utf-8")) > 1024:
        raise ValueError("Password must be at most 1024 UTF-8 bytes")
    return value


Password = Annotated[
    str, Field(min_length=15, max_length=128), AfterValidator(validate_password)
]


class DeviceMetadata(BaseModel):
    device_type: AuthDeviceType | None = None
    device_name: str | None = Field(None, max_length=255)
    device_id: str | None = Field(None, max_length=255)

    @field_validator("device_name", "device_id", mode="before")
    @classmethod
    def normalize_strings(cls, v):
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v


class RegisterRequest(DeviceMetadata):
    email: EmailStr
    password: Password
    full_name: str = Field(..., min_length=1, max_length=200)

    @field_validator("full_name", mode="before")
    @classmethod
    def strip_name(cls, value):
        return value.strip() if isinstance(value, str) else value


class LoginRequest(DeviceMetadata):
    email: EmailStr
    password: str = Field(max_length=1024)


class TokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    session_id: uuid.UUID
    user: LawyerProfileResponse


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    session_id: uuid.UUID


class RefreshTokenRequest(BaseModel):
    refresh_token: str | None = None


class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    session_id: uuid.UUID


class LogoutRequest(BaseModel):
    refresh_token: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: Password

    @field_validator("new_password")
    @classmethod
    def validate(cls, v, info):
        if info.data.get("current_password") == v:
            raise ValueError("New password must differ")
        return v


class GoogleLoginRequest(DeviceMetadata):
    id_token: str


class EmailRequest(BaseModel):
    email: EmailStr


class CodeRequest(BaseModel):
    code: str = Field(pattern=r"^[0-9]{8}$")


class VerificationRequest(EmailRequest):
    pass


class VerificationConfirmRequest(CodeRequest):
    flow: str = Field(min_length=40, max_length=200)


class VerificationPendingResponse(BaseModel):
    status: str = "verification_pending"
    verification_flow: str | None = None
    message: str = "If this account is eligible, a verification code is being sent."


class ResetPasswordRequest(EmailRequest, CodeRequest):
    new_password: Password


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    device_type: AuthDeviceType
    device_name: str | None
    created_at: datetime
    last_seen_at: datetime
    expires_at: datetime
