import secrets
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.production"), extra="ignore", case_sensitive=True
    )

    APP_ENV: str = "development"
    DEBUG: bool = True

    SECRET_KEY: str = secrets.token_hex(32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    COOKIE_DOMAIN: str | None = None
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"

    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM: str = ""
    SMTP_STARTTLS: bool = True
    SMTP_SSL: bool = False

    # Authentication mail is server-to-server only.  Keep SMTP as an explicit
    # development fallback; production uses the Resend adapter.
    AUTH_EMAIL_PROVIDER: Literal["resend", "smtp"] = "resend"
    RESEND_API_KEY: str = ""
    RESEND_WEBHOOK_SECRET: str = ""
    AUTH_EMAIL_FROM: str = ""
    AUTH_PUBLIC_WEB_URL: str = "http://localhost:3000"
    AUTH_CODE_PEPPER: str = ""
    AUTH_VERIFICATION_TTL_MINUTES: int = Field(default=10, ge=5, le=30)
    AUTH_RESEND_COOLDOWN_SECONDS: int = Field(default=60, ge=30, le=600)

    DATABASE_URL: str
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Celery queue configuration (S01-07).
    # Redis is transport only; PostgreSQL remains the job state authority.
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    ENABLE_SPIKE_ENDPOINTS: bool = False

    # AI provider configuration (S01-02/03).
    # Keys are server-only. Empty allowlists permit only the configured default.
    GEMINI_API_KEY: str = ""
    # GEMINI_MODEL and GEMINI_ALLOWED_MODELS are environment-backed. Chamber
    # policy selects the transcription model, but it must be in this allowlist.
    GEMINI_MODEL: str = ""
    GEMINI_ALLOWED_MODELS: list[str] = []
    # Gemini 3.6 Flash spends output-token budget on thinking as well as the
    # visible response. OCR is a bounded extraction task, so minimal thinking
    # preserves that budget for complete structured text. Operators can raise
    # this only for a model/policy combination that supports the chosen level.
    GEMINI_OCR_THINKING_LEVEL: Literal["minimal", "low", "medium", "high"] = "minimal"
    GEMINI_SUMMARY_THINKING_LEVEL: Literal["minimal", "low", "medium", "high"] = "minimal"
    GEMINI_INLINE_DATA_MAX_BYTES: int = Field(
        default=20 * 1024 * 1024, ge=64 * 1024, le=50 * 1024 * 1024
    )
    OCR_TRANSIENT_MAX_RETRIES: int = Field(default=3, ge=0, le=5)
    OCR_TRANSIENT_RETRY_BASE_SECONDS: int = Field(default=10, ge=1, le=300)
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL: str = "deepseek-flash"
    DRAFT_ANONYMIZATION_BUDGET_USD: float = Field(default=0.10, gt=0, le=10)
    DRAFT_ANONYMIZATION_THINKING_LEVEL: Literal["minimal", "low"] = "minimal"
    DRAFT_ANONYMIZATION_DETECTION_TOKENS: int = Field(default=8192, ge=1024, le=16000)
    DRAFT_ANONYMIZATION_AUDIT_TOKENS: int = Field(default=2048, ge=512, le=8192)
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = ""
    OPENAI_ALLOWED_MODELS: list[str] = []
    SARVAM_API_KEY: str = ""
    # Document Intelligence is intentionally separate from speech.  Keep it
    # disabled until an operator has verified the account's Parse limits and
    # installed a transcription policy that explicitly routes to Sarvam.
    SARVAM_DOCUMENT_INTELLIGENCE_ENABLED: bool = False
    SARVAM_DOC_AI_API_KEY: str = ""
    SARVAM_DOC_AI_BASE_URL: str = "https://api.sarvam.ai"
    SARVAM_DOC_AI_ALLOWED_MODELS: list[str] = ["sarvam-vision-v1"]
    SARVAM_DOC_AI_TIMEOUT_SECONDS: int = Field(default=60, ge=5, le=300)
    SARVAM_DOC_AI_POLL_SECONDS: int = Field(default=10, ge=3, le=60)
    SARVAM_DOC_AI_LANGUAGE: str = "hi-IN"
    SARVAM_DOC_AI_CONTENT_TYPE: Literal["printed", "handwritten", "mixed"] = "printed"
    SARVAM_DOC_AI_MAX_BYTES: int = Field(
        default=20 * 1024 * 1024, ge=64 * 1024, le=50 * 1024 * 1024
    )
    # Parse pricing is page based, unlike Gemini's token quote. Operators set
    # this only after confirming the active Sarvam account rate card.
    SARVAM_DOC_AI_PAISE_PER_PAGE: int = Field(default=0, ge=0, le=100_000)
    SARVAM_DOC_AI_PRICING_VALID_UNTIL: str = ""
    SARVAM_CHAT_MODEL: str = "sarvam-105b-conversations"
    SARVAM_STT_MODEL: str = "saaras:v4"
    SARVAM_STT_MAX_BYTES: int = Field(
        default=10 * 1024 * 1024,
        ge=64 * 1024,
        le=25 * 1024 * 1024,
    )
    SARVAM_STT_TIMEOUT_SECONDS: int = Field(default=45, ge=5, le=120)
    SARVAM_REALTIME_MAX_SECONDS: int = Field(default=60, ge=10, le=120)
    AI_REQUEST_TIMEOUT_SECONDS: int = 60
    # Multimodal case summaries can take several minutes before Gemini sends
    # its first response byte. Keep this separate from short AI operations.
    GEMINI_SUMMARY_READ_TIMEOUT_SECONDS: int = Field(default=600, ge=60, le=1800)

    # Indian Kanoon is deliberately off until an owner has configured both a
    # server-only token and a chamber policy.  No client receives this token.
    INDIAN_KANOON_ENABLED: bool = False
    INDIAN_KANOON_API_TOKEN: str = ""
    INDIAN_KANOON_TIMEOUT_SECONDS: int = Field(default=20, ge=5, le=60)
    INDIAN_KANOON_MAX_RESPONSE_BYTES: int = Field(
        default=2 * 1024 * 1024, ge=64 * 1024, le=10 * 1024 * 1024
    )
    INDIAN_KANOON_MAX_SEARCH_PAGES: int = Field(default=3, ge=1, le=10)
    INDIAN_KANOON_MAX_SELECTED_AUTHORITIES: int = Field(default=5, ge=1, le=20)
    INDIAN_KANOON_RATE_CARD_VERSION: str = "2026-10-observed"

    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "vakilsuite-dev"

    # A manager-provisioned directory of hash-verified, non-synthetic OKF
    # bundles. Empty means production case exports are unavailable by design.
    OKF_BUNDLES_DIR: str = ""
    # Operator-reviewed conservative paise-per-million-token estimates. Zero disables paid drafting.
    DRAFT_PRICING_MODEL: str = ""
    DRAFT_INPUT_PAISE_PER_MILLION: int = Field(default=0, ge=0)
    DRAFT_OUTPUT_PAISE_PER_MILLION: int = Field(default=0, ge=0)
    DRAFT_PRICING_VALID_UNTIL: str = ""

    # Used only for Google sign-in; document processing credentials are intentionally absent.
    GOOGLE_CLIENT_ID: str = ""
    SENTRY_DSN: str = ""

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors(cls, value: list[str]) -> list[str]:
        if not value:
            raise ValueError("CORS_ORIGINS cannot be empty")
        return value

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value):
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"debug", "dev", "development"}:
                return True
        return value

    def validate_production(self) -> None:
        if self.APP_ENV == "production":
            if len(self.SECRET_KEY) < 32:
                raise RuntimeError("SECRET_KEY is not secure")
            if self.DEBUG:
                raise RuntimeError("DEBUG must be False in production")
            if "localhost" in self.DATABASE_URL:
                raise RuntimeError("DATABASE_URL cannot point to localhost in production")
            if not self.SENTRY_DSN:
                raise RuntimeError("SENTRY_DSN required in production")
            if not self.COOKIE_SECURE:
                raise RuntimeError("COOKIE_SECURE must be True in production")
            if "SECRET_KEY" not in self.model_fields_set:
                raise RuntimeError("SECRET_KEY must be explicitly configured in production")
            if not self.AUTH_CODE_PEPPER:
                raise RuntimeError("AUTH_CODE_PEPPER is required in production")
            if self.AUTH_EMAIL_PROVIDER != "resend" or not self.RESEND_API_KEY or not self.AUTH_EMAIL_FROM:
                raise RuntimeError("Resend authentication email settings are required in production")
        if self.COOKIE_SAMESITE == "none" and not self.COOKIE_SECURE:
            raise RuntimeError("COOKIE_SAMESITE=none requires COOKIE_SECURE=true")


settings = Settings()
settings.validate_production()
