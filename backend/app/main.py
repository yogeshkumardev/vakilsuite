from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import app.db.registry  # noqa: F401 - register all SQLAlchemy models before routes

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
        integrations=[
            FastApiIntegration(),
        ],
    )

from app.features.users.router import router as users_router
from app.features.auth.router import router as auth_router
from app.features.auth.webhooks import router as auth_webhooks_router
from app.features.cases.router import (
    case_numbers_router,
    case_sections_router,
    parties_router,
    matters_router,
    router as cases_router,
)
from app.features.documents.router import router as documents_router
from app.features.jobs.router import router as jobs_router  # S01-07
from app.features.exports.router import router as exports_router
from app.features.dictation.router import router as dictation_router
from app.features.dictation.realtime import router as dictation_realtime_router
from app.features.workflows.router import router as workflows_router
from app.features.chambers.router import router as chambers_router
from app.features.clients.router import router as clients_router, case_clients_router
from app.features.fees.router import router as fees_router
from app.features.receipts.router import router as receipts_router
from app.features.revisions.router import case_router as working_document_case_router
from app.features.revisions.router import editor_sessions_router, router as working_documents_router
from app.features.summaries.router import router as summaries_router
from app.features.okf_exports.router import router as okf_exports_router
from app.features.legal_research.router import router as legal_research_router
from app.features.drafts.router import profile_router as advocate_profile_router, router as court_drafts_router
from fastapi.openapi.utils import get_openapi
from app.core.api_responses import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="VakilSuite API",
        version="1.0.0",
        routes=app.routes,
    )
    openapi_schema["components"]["securitySchemes"] = {
        "HTTPBearer": {
            "type": "http",
            "scheme": "bearer",
        }
    }
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app = FastAPI(
    title="VakilSuite API",
    version="1.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "Content-Length", "X-Chamber-Id"],
)

from app.middleware.rate_limit import RateLimitMiddleware  # noqa: E402
from app.middleware.csrf import CookieCsrfMiddleware  # noqa: E402

app.add_middleware(RateLimitMiddleware)
app.add_middleware(CookieCsrfMiddleware)

# Custom error handlers (AppError + RequestValidationError)
register_exception_handlers(app)
# Routers
API_PREFIX = "/api/v1"
app.include_router(cases_router, prefix=API_PREFIX)
app.include_router(case_numbers_router, prefix=API_PREFIX)
app.include_router(case_sections_router, prefix=API_PREFIX)
app.include_router(parties_router, prefix=API_PREFIX)
app.include_router(matters_router, prefix=API_PREFIX)
app.include_router(users_router, prefix=API_PREFIX)
app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(auth_webhooks_router, prefix=API_PREFIX)
app.include_router(documents_router, prefix=API_PREFIX)
app.include_router(jobs_router, prefix=API_PREFIX)  # S01-07 queue spike
app.include_router(exports_router, prefix=API_PREFIX)
app.include_router(dictation_router, prefix=API_PREFIX)
app.include_router(dictation_realtime_router, prefix=API_PREFIX)
app.include_router(workflows_router, prefix=API_PREFIX)
app.include_router(chambers_router, prefix=API_PREFIX)
app.include_router(clients_router, prefix=API_PREFIX)
app.include_router(case_clients_router, prefix=API_PREFIX)
app.include_router(fees_router, prefix=API_PREFIX)
app.include_router(receipts_router, prefix=API_PREFIX)
app.include_router(working_document_case_router, prefix=API_PREFIX)
app.include_router(working_documents_router, prefix=API_PREFIX)
app.include_router(editor_sessions_router, prefix=API_PREFIX)
app.include_router(summaries_router, prefix=API_PREFIX)
app.include_router(okf_exports_router, prefix=API_PREFIX)
app.include_router(legal_research_router, prefix=API_PREFIX)
app.include_router(court_drafts_router, prefix=API_PREFIX)
app.include_router(advocate_profile_router, prefix=API_PREFIX)


@app.get("/health", tags=["Health"], response_model=HealthResponse, operation_id="health_check")
async def health_check():
    return {"status": "ok"}
