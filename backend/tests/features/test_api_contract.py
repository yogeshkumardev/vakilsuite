import json
from pathlib import Path

from app.core.api_responses import AuthData, SuccessResponse
from app.features.documents.schemas import (
    ConfirmUploadRequest, ConfirmUploadResponse, PresignUploadRequest,
    PresignUploadResponse, ViewUrlResponse,
)
from app.main import app

FIXTURE = json.loads((Path(__file__).parents[1] / "fixtures/baseline.json").read_text())


def test_all_runtime_routes_have_named_responses_and_unique_operation_ids():
    # Inspect OpenAPI, which also traverses FastAPI's included routers.
    operations = [operation for path in app.openapi()["paths"].values() for operation in path.values()]
    ids = [operation["operationId"] for operation in operations]
    assert len(ids) == len(set(ids))
    for operation in operations:
        successful = [r for code, r in operation["responses"].items() if code.startswith("2")]
        assert successful
        for response in successful:
            content = response.get("content", {})
            json_schema = content.get("application/json", {}).get("schema", {})
            binary_schemas = [
                media.get("schema", {})
                for content_type, media in content.items()
                if content_type != "application/json"
            ]
            assert "$ref" in json_schema or any(
                schema.get("type") == "string" and schema.get("format") == "binary"
                for schema in binary_schemas
            )
    assert operations


def test_login_and_health_are_not_marked_as_bearer_only():
    schema = app.openapi()
    assert not schema.get("security")
    assert not schema["paths"]["/api/v1/auth/login"]["post"].get("security")
    assert not schema["paths"]["/health"]["get"].get("security")


def test_shared_web_mobile_upload_fixture_matches_runtime_schemas():
    PresignUploadRequest.model_validate(FIXTURE["presign_request"])
    ConfirmUploadRequest.model_validate(FIXTURE["confirm_request"])
    SuccessResponse[PresignUploadResponse].model_validate(FIXTURE["presign_response"])
    confirmation = SuccessResponse[ConfirmUploadResponse].model_validate(FIXTURE["confirm_response"])
    SuccessResponse[ViewUrlResponse].model_validate(FIXTURE["view_response"])
    assert set(confirmation.data.model_dump()) == {"document"}
    assert not any(field.startswith(("ocr_", "processing_")) for field in confirmation.data.document.model_dump())


def test_browser_refresh_token_is_optional_native_token_is_retained():
    data = {"access_token": "synthetic", "session_id": FIXTURE["session_id"], "token_type": "bearer", "user": FIXTURE["user"]}
    web = AuthData.model_validate(data).model_dump(exclude_unset=True)
    assert "refresh_token" not in web
    native = AuthData.model_validate({**data, "refresh_token": "synthetic-native"})
    assert native.refresh_token == "synthetic-native"


def test_removed_pipelines_are_not_exposed():
    paths = app.openapi()["paths"]
    for path in paths:
        assert not any(word in path for word in ("processing-", "understanding", "typed-version", "context", "drafts", "courtroom", "notifications", "cause-list"))
