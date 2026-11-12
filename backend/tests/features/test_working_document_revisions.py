import copy
import uuid
from datetime import datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from pydantic import ValidationError as PydanticValidationError

from app.core.exceptions import ConflictError, ValidationError
from app.features.revisions.lexical import validate_editor_document
from app.features.revisions.models import RevisionStatus
from app.features.revisions.schemas import (
    CreateRevisionRequest,
    DecideRevisionRequest,
    RevisionDecisionAction,
    SubmitRevisionRequest,
)
from app.features.revisions.service import WorkingDocumentService
from app.main import app


def valid_document():
    return {
        "schemaVersion": 1,
        "pageLayout": {
            "pageSize": "A4", "orientation": "portrait",
            "marginTop": 20, "marginRight": 20, "marginBottom": 20, "marginLeft": 20,
        },
        "editorState": {
            "root": {
                "type": "root", "version": 1, "direction": None, "format": "", "indent": 0,
                "children": [
                    {"type": "paragraph", "version": 1, "children": [
                        {"type": "text", "version": 1, "text": "नमस्ते\r\nVakilSuite", "format": 0, "detail": 0, "mode": "normal", "style": ""}
                    ]}
                ],
            }
        },
    }


def test_server_derives_normalized_text_source_map_and_stable_hash():
    result = validate_editor_document(valid_document())
    assert result.normalized_text == "नमस्ते\nVakilSuite\n"
    assert result.source_map == [{
        "path": "editorState.root.children.0.children.0", "start": 0, "end": len("नमस्ते\nVakilSuite"),
    }]
    assert result.source_map[0]["end"] <= len(result.normalized_text)
    assert len(result.content_sha256) == 64
    assert result.content_sha256 == validate_editor_document(copy.deepcopy(valid_document())).content_sha256


@pytest.mark.parametrize("node", [
    {"type": "script", "version": 1},
    {"type": "text", "version": 1, "text": 12},
])
def test_unsupported_or_malformed_nodes_are_rejected(node):
    payload = valid_document()
    payload["editorState"]["root"]["children"] = [node]
    with pytest.raises(ValidationError):
        validate_editor_document(payload)


def test_working_document_routes_are_named_and_versioned():
    paths = app.openapi()["paths"]
    assert "/api/v1/cases/{case_id}/working-documents" in paths
    assert "/api/v1/working-documents/{document_id}/revisions" in paths
    assert paths["/api/v1/working-documents/{document_id}/revisions"]["post"]["operationId"] == "working_documents_create_revision"
    assert paths["/api/v1/working-documents/{document_id}/revisions/{revision_id}/submit"]["post"]["operationId"] == "working_documents_submit_revision"
    assert paths["/api/v1/working-documents/{document_id}/revisions/{revision_id}/decision"]["post"]["operationId"] == "working_documents_decide_revision"


def test_revision_save_requires_compare_and_swap_and_idempotency_fields():
    mutation_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
    request = CreateRevisionRequest.model_validate({
        "expected_revision_number": 1,
        "client_mutation_id": mutation_id,
        "editor_document": valid_document(),
    })
    assert str(request.client_mutation_id) == mutation_id
    with pytest.raises(PydanticValidationError):
        CreateRevisionRequest.model_validate({"editor_document": valid_document()})
    SubmitRevisionRequest.model_validate({"expected_content_sha256": "a" * 64})
    with pytest.raises(PydanticValidationError):
        SubmitRevisionRequest.model_validate({"expected_content_sha256": "not-a-hash"})


@pytest.mark.parametrize(
    ("action", "destination", "event_type", "allowed"),
    [
        (RevisionDecisionAction.approve, RevisionStatus.approved, "approved", {RevisionStatus.submitted}),
        (RevisionDecisionAction.request_changes, RevisionStatus.changes_requested, "changes_requested", {RevisionStatus.submitted}),
        (RevisionDecisionAction.revoke, RevisionStatus.revoked, "revoked", {RevisionStatus.approved}),
    ],
)
def test_review_lifecycle_has_only_explicit_legal_transitions(action, destination, event_type, allowed):
    transition = WorkingDocumentService._decision_transition(action)
    assert transition[0] == destination
    assert transition[1].value == event_type
    assert transition[2] == allowed
    request = DecideRevisionRequest.model_validate({
        "action": action.value,
        "expected_content_sha256": "c" * 64,
        "comment": "Please review the evidence date.",
    })
    assert request.action == action


def revision(*, revision_number: int, content_sha256: str, client_mutation_id=None):
    now = datetime.now()
    return SimpleNamespace(
        id=uuid.uuid4(),
        working_document_id=uuid.uuid4(),
        case_id=uuid.uuid4(),
        chamber_id=uuid.uuid4(),
        revision_number=revision_number,
        parent_revision_id=None,
        client_mutation_id=client_mutation_id,
        status=RevisionStatus.saved,
        editor_schema_version=1,
        editor_document=valid_document(),
        normalized_text="fixture\n",
        source_map=[],
        content_sha256=content_sha256,
        created_by_user_id=uuid.uuid4(),
        created_at=now,
    )


def service_harness(*, latest, existing=None):
    db = AsyncMock()
    db.add = Mock()
    service = WorkingDocumentService(db)
    document = SimpleNamespace(id=uuid.uuid4(), case_id=uuid.uuid4(), chamber_id=uuid.uuid4())
    user = SimpleNamespace(id=uuid.uuid4())
    case = SimpleNamespace(id=document.case_id, chamber_id=document.chamber_id)
    service.repo.get_locked = AsyncMock(return_value=document)
    service.repo.get_by_client_mutation = AsyncMock(return_value=existing)
    service.repo.get_latest_revision = AsyncMock(return_value=latest)
    service.case_repo.can_access = AsyncMock(return_value=True)
    service.case_repo.can_edit = AsyncMock(return_value=True)
    service.case_repo.get_by_id_simple = AsyncMock(return_value=case)
    return service, db, document, user


@pytest.mark.asyncio
async def test_stale_autosave_is_rejected_with_the_current_revision_details():
    latest = revision(revision_number=2, content_sha256="b" * 64)
    service, db, document, user = service_harness(latest=latest)
    body = CreateRevisionRequest(
        expected_revision_number=1,
        client_mutation_id=uuid.uuid4(),
        editor_document=valid_document(),
    )
    with pytest.raises(ConflictError) as exc_info:
        await service.create_revision(document.id, body, user)
    assert exc_info.value.details["current_revision_number"] == 2
    assert exc_info.value.details["current_revision_id"] == str(latest.id)
    db.add.assert_not_called()
    db.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_same_autosave_retry_returns_its_existing_revision_without_writing_again():
    content_hash = validate_editor_document(valid_document()).content_sha256
    mutation_id = uuid.uuid4()
    existing = revision(
        revision_number=2,
        content_sha256=content_hash,
        client_mutation_id=mutation_id,
    )
    service, db, document, user = service_harness(latest=None, existing=existing)
    body = CreateRevisionRequest(
        expected_revision_number=1,
        client_mutation_id=mutation_id,
        editor_document=valid_document(),
    )
    result = await service.create_revision(document.id, body, user)
    assert result.id == existing.id
    assert result.revision_number == 2
    db.add.assert_not_called()
    db.commit.assert_not_awaited()
