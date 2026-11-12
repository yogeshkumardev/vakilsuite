"""Run with AUTH_INTEGRATION_DB=1 against a local PostgreSQL database.

Each test creates and drops its own schema; existing application data is untouched.
"""

import asyncio
import os
import uuid
from datetime import timedelta
from unittest.mock import AsyncMock, Mock

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import MetaData, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core import dependencies
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.security import create_refresh_token, hash_refresh_token
from app.db.registry import Base
from app.db.session import get_db
from app.features.auth import recovery
from app.features.auth.guards import guard_auth_request
from app.features.auth.models import AuthChallenge, AuthSession
from app.features.auth.router import router as auth_router
from app.features.cases.router import matters_router, router as cases_router
from app.features.chambers.router import router as chambers_router
from app.features.clients.router import case_clients_router, router as clients_router
from app.features.documents.router import router as documents_router
from app.features.fees.router import router as fees_router
from app.features.users.router import router as users_router

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(
        os.getenv("AUTH_INTEGRATION_DB") != "1",
        reason="Requires explicitly enabled local PostgreSQL",
    ),
]
PASSWORD = "test-password-123"


@pytest_asyncio.fixture
async def api(monkeypatch):
    if settings.APP_ENV == "production":
        pytest.fail("Auth integration tests must not target production")
    schema = "auth_test_" + uuid.uuid4().hex
    admin = create_async_engine(settings.DATABASE_URL, connect_args={"timeout": 5})
    engine = create_async_engine(
        settings.DATABASE_URL,
        connect_args={"timeout": 5, "server_settings": {"search_path": schema}},
    )
    factory = async_sessionmaker(engine, expire_on_commit=False)
    metadata = MetaData()
    tables = [
        Base.metadata.tables[name].to_metadata(metadata)
        for name in (
            "users",
                "chambers",
                "chamber_memberships",
                "chamber_audit_events",
                "chamber_provider_policy_versions",
                "clients",
                "client_case_links",
                "proceedings",
                "fee_agreements",
                "fee_ledger_entries",
            "auth_sessions",
            "auth_challenges",
            "cases",
            "case_access",
            "case_numbers",
            "case_sections",
            "parties",
            "documents",
        )
    ]
    # Legacy models declare some indexes both inline and in __table_args__.
    for table in tables:
        seen = set()
        for index in list(table.indexes):
            if index.name in seen:
                table.indexes.remove(index)
            seen.add(index.name)
    monkeypatch.setattr(dependencies, "redis_client", None)
    monkeypatch.setattr(recovery, "require_email_delivery", lambda: None)
    sent = AsyncMock()
    monkeypatch.setattr(recovery, "send_auth_code", sent)
    app = FastAPI()
    register_exception_handlers(app)
    for router in (
        auth_router,
        users_router,
        chambers_router,
        clients_router,
        case_clients_router,
        cases_router,
        matters_router,
        documents_router,
        fees_router,
    ):
        app.include_router(router, prefix="/api/v1")

    async def db_override():
        async with factory() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    app.dependency_overrides[get_db] = db_override
    app.dependency_overrides[guard_auth_request] = lambda: None
    async with admin.begin() as connection:
        await connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    try:
        async with engine.begin() as connection:
            await connection.run_sync(metadata.create_all)
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app), base_url="http://test/api/v1/"
        ) as client:
            yield client, factory, sent
    finally:
        await engine.dispose()
        async with admin.begin() as connection:
            await connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()


async def signup(client, email="lawyer@example.com"):
    response = await client.post(
        "auth/register",
        json={
            "email": email,
            "password": PASSWORD,
            "full_name": "Test Advocate",
            "device_type": "android",
        },
    )
    assert response.status_code == 201, response.text
    assert not response.headers.get("set-cookie")
    return response.json()["data"]


async def add_to_personal_chamber(client, owner, member_user_id: str, role: str) -> None:
    chambers = await client.get("chambers", headers=bearer(owner))
    assert chambers.status_code == 200, chambers.text
    personal_chambers = chambers.json()["data"]
    assert len(personal_chambers) == 1
    response = await client.post(
        f"chambers/{personal_chambers[0]['id']}/members",
        headers=bearer(owner),
        json={"user_id": member_user_id, "role": role},
    )
    assert response.status_code == 201, response.text


async def test_case_soft_delete_hides_documents_but_preserves_storage_and_rows(api, monkeypatch):
    from app.features.cases.models import Case
    from app.features.documents.models import Document

    client, factory, _ = api
    storage = Mock()
    storage.generate_presigned_url.return_value = "https://storage.example/document"
    monkeypatch.setattr("app.features.documents.service._get_r2_client", lambda: storage)
    owner = await signup(client)
    collaborator = await signup(client, "collaborator@example.com")
    outsider = await signup(client, "outsider@example.com")
    headers = bearer(owner)
    created = await client.post("cases", headers=headers, json={"case_title": "Soft delete test", "case_type": "other", "petitioner_name": "Test"})
    assert created.status_code == 201, created.text
    case_id = created.json()["data"]["case"]["id"]
    await add_to_personal_chamber(client, owner, collaborator["user"]["id"], "staff")
    assert (await client.post(f"cases/{case_id}/access", headers=headers, json={"user_id": collaborator["user"]["id"], "can_edit": True})).status_code == 201
    payload = {"filename": "test.pdf", "mime_type": "application/pdf", "file_size_bytes": 100, "client_upload_id": str(uuid.uuid4())}
    uploaded = await client.post(f"cases/{case_id}/documents/presign", headers=headers, json=payload)
    assert uploaded.status_code == 201, uploaded.text
    doc_id = uploaded.json()["data"]["document_id"]
    assert (await client.post(f"documents/{doc_id}/confirm-upload", headers=headers, json={})).status_code == 200
    assert (
        await client.post(f"cases/{case_id}/soft-delete", headers=bearer(collaborator))
    ).status_code == 403
    # Hide the existence of a case from someone with no chamber membership.
    assert (
        await client.post(f"cases/{case_id}/soft-delete", headers=bearer(outsider))
    ).status_code == 404
    # Archive is separate and must leave the original accessible.
    assert (await client.delete(f"cases/{case_id}", headers=headers)).status_code == 200
    assert (await client.get(f"documents/{doc_id}/view-url", headers=headers)).status_code == 200
    # A racing new upload either commits before deletion (and gets marked too),
    # or waits for the case lock and is denied. It must never resurrect a file.
    deletion, racing_upload = await asyncio.gather(
        client.post(f"cases/{case_id}/soft-delete", headers=headers),
        client.post(f"cases/{case_id}/documents/presign", headers=headers, json={**payload, "client_upload_id": str(uuid.uuid4())}),
    )
    assert deletion.status_code == 200
    assert racing_upload.status_code in (201, 404)
    for tokens in (owner, collaborator, outsider):
        auth = bearer(tokens)
        listed = (await client.get("cases", headers=auth)).json()["data"]
        assert listed["cases"] == []
        assert listed["pagination"]["total"] == 0
        for path in (f"cases/{case_id}", f"cases/{case_id}/permissions", f"cases/{case_id}/documents", f"documents/{doc_id}", f"documents/{doc_id}/view-url"):
            assert (await client.get(path, headers=auth)).status_code == 404
    assert (await client.patch(f"cases/{case_id}", headers=headers, json={"case_title": "Resurrect"})).status_code == 404
    assert (await client.post(f"cases/{case_id}/documents/presign", headers=headers, json=payload)).status_code == 404
    assert (await client.post(f"documents/{doc_id}/confirm-upload", headers=headers, json={})).status_code == 404
    assert (await client.post(f"cases/{case_id}/soft-delete", headers=headers)).status_code == 404
    async with factory() as db:
        case = await db.get(Case, uuid.UUID(case_id))
        document = await db.get(Document, uuid.UUID(doc_id))
        assert case.deleted_at is not None
        assert document.deleted_at == case.deleted_at
        assert document.r2_key
        all_documents = (await db.execute(select(Document).where(Document.case_id == case.id))).scalars().all()
        assert all(item.deleted_at == case.deleted_at for item in all_documents)
    storage.delete_object.assert_not_called()


def bearer(tokens):
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def test_concurrent_mobile_presign_retries_create_one_shared_document(api, monkeypatch):
    client, _, _ = api
    r2 = Mock()
    r2.generate_presigned_url.return_value = "https://storage.example/upload"
    monkeypatch.setattr("app.features.documents.service._get_r2_client", lambda: r2)
    phone = await signup(client)
    created = await client.post("cases", headers=bearer(phone), json={
        "case_title": "Mobile scan retry", "case_type": "bail_application", "petitioner_name": "Petitioner",
    })
    assert created.status_code == 201, created.text
    case_id = created.json()["data"]["case"]["id"]
    path = f"cases/{case_id}/documents/presign"
    body = {
        "filename": "scan.pdf", "mime_type": "application/pdf", "file_size_bytes": 1200,
        "client_upload_id": str(uuid.uuid4()),
    }
    first, retry = await asyncio.gather(
        client.post(path, headers=bearer(phone), json=body),
        client.post(path, headers=bearer(phone), json=body),
    )
    assert first.status_code == retry.status_code == 201, (first.text, retry.text)
    assert first.json()["data"]["document_id"] == retry.json()["data"]["document_id"]
    web = await client.post("auth/login", json={"email": "lawyer@example.com", "password": PASSWORD})
    assert web.status_code == 200
    documents = await client.get(f"cases/{case_id}/documents", headers=bearer(web.json()["data"]))
    assert documents.status_code == 200, documents.text
    assert len(documents.json()["data"]["documents"]) == 1
    changed = await client.post(path, headers=bearer(phone), json={**body, "filename": "changed.pdf"})
    assert changed.status_code == 409, changed.text


async def test_android_signup_web_login_case_sync_and_cross_account_denial(api):
    client, _, _ = api
    phone = await signup(client)
    web = await client.post(
        "auth/login", json={"email": "LAWYER@example.com", "password": PASSWORD}
    )
    assert web.status_code == 200
    assert web.json()["data"]["user"]["id"] == phone["user"]["id"]
    assert "refresh_token" not in web.json()["data"]
    assert "HttpOnly" in web.headers["set-cookie"]
    created = await client.post(
        "cases",
        headers=bearer(phone),
        json={
            "case_title": "John Doe Bail Application 2026",
            "case_type": "bail_application",
            "petitioner_name": "John Doe",
        },
    )
    assert created.status_code == 201, created.text
    case_id = created.json()["data"]["case"]["id"]
    web_cases = await client.get("cases")
    assert web_cases.json()["data"]["cases"][0]["id"] == case_id
    outsider = await signup(client, "other@example.com")
    assert (
        await client.get(f"cases/{case_id}", headers=bearer(outsider))
    ).status_code == 404
    assert (await client.get("cases", headers=bearer(outsider))).json()["data"][
        "cases"
    ] == []
    assert (
        await client.get(f"cases/{case_id}/documents", headers=bearer(outsider))
    ).status_code == 404
    assert (
        await client.post(
            f"cases/{case_id}/documents/presign",
            headers=bearer(outsider),
            json={
                "filename": "test.pdf",
                "mime_type": "application/pdf",
                "file_size_bytes": 100,
            },
        )
    ).status_code == 403


async def test_refresh_rotation_concurrency_replay_and_immediate_logout(api):
    client, factory, _ = api
    tokens = await signup(client)
    responses = await asyncio.gather(
        *[
            client.post("auth/refresh", json={"refresh_token": tokens["refresh_token"]})
            for _ in range(2)
        ]
    )
    assert sorted(response.status_code for response in responses) == [200, 401]
    rotated = next(
        response.json()["data"] for response in responses if response.status_code == 200
    )
    async with factory() as db:
        session = await db.get(AuthSession, uuid.UUID(tokens["session_id"]))
        assert session.refresh_token_hash == hash_refresh_token(
            rotated["refresh_token"]
        )
        assert session.refresh_token_hash != rotated["refresh_token"]
    assert (
        await client.post(
            "auth/logout", json={"refresh_token": rotated["refresh_token"]}
        )
    ).status_code == 200
    assert (await client.get("users/me", headers=bearer(tokens))).status_code == 401
    assert (await client.get("users/me", headers=bearer(rotated))).status_code == 401
    legacy = create_refresh_token(uuid.UUID(tokens["user"]["id"]))
    assert (
        await client.post("auth/refresh", json={"refresh_token": legacy})
    ).status_code == 401


async def test_device_revocation_is_owner_scoped_and_password_change_revokes_all(api):
    client, _, _ = api
    phone = await signup(client)
    second = (
        await client.post(
            "auth/login",
            json={
                "email": phone["user"]["email"],
                "password": PASSWORD,
                "device_type": "android",
            },
        )
    ).json()["data"]
    outsider = await signup(client, "other@example.com")
    denied = await client.delete(
        f"auth/sessions/{phone['session_id']}", headers=bearer(outsider)
    )
    assert denied.status_code == 404
    sessions = (await client.get("auth/sessions", headers=bearer(phone))).json()[
        "data"
    ]["sessions"]
    assert len(sessions) == 2
    assert all("refresh_token_hash" not in session for session in sessions)
    wrong = await client.post(
        "auth/change-password",
        headers=bearer(phone),
        json={"current_password": "wrong", "new_password": "updated-password-123"},
    )
    assert wrong.status_code == 422
    assert (await client.get("users/me", headers=bearer(phone))).status_code == 200
    changed = await client.post(
        "auth/change-password",
        headers=bearer(phone),
        json={"current_password": PASSWORD, "new_password": "updated-password-123"},
    )
    assert changed.status_code == 200
    for tokens in (phone, second):
        assert (await client.get("users/me", headers=bearer(tokens))).status_code == 401
        assert (
            await client.post(
                "auth/refresh", json={"refresh_token": tokens["refresh_token"]}
            )
        ).status_code == 401


async def test_password_reset_single_use_expiry_and_attempt_limit(api):
    client, factory, sent = api
    phone = await signup(client)
    known = await client.post(
        "auth/forgot-password", json={"email": "lawyer@example.com"}
    )
    unknown = await client.post(
        "auth/forgot-password", json={"email": "nobody@example.com"}
    )
    assert known.json() == unknown.json()
    code = sent.call_args.args[1]
    async with factory() as db:
        challenge = await db.scalar(select(AuthChallenge))
        assert challenge.code_hash != code
    reset_body = {
        "email": "lawyer@example.com",
        "code": code,
        "new_password": "replacement-password",
    }
    assert (
        await client.post("auth/reset-password", json=reset_body)
    ).status_code == 200
    assert (
        await client.post("auth/reset-password", json=reset_body)
    ).status_code == 422
    assert (await client.get("users/me", headers=bearer(phone))).status_code == 401
    login = await client.post(
        "auth/login",
        json={
            "email": "lawyer@example.com",
            "password": "replacement-password",
            "device_type": "android",
        },
    )
    assert login.status_code == 200
    # Re-enable the fixture challenge to exercise attempt exhaustion and expiry.
    async with factory() as db:
        challenge = await db.scalar(select(AuthChallenge))
        challenge.used_at = None
        await db.commit()
    bad = "00000000" if code != "00000000" else "11111111"
    for _ in range(5):
        assert (
            await client.post("auth/reset-password", json={**reset_body, "code": bad})
        ).status_code == 422
    assert (
        await client.post("auth/reset-password", json=reset_body)
    ).status_code == 422
    async with factory() as db:
        challenge = await db.scalar(select(AuthChallenge))
        challenge.attempts = 0
        challenge.expires_at = recovery.utcnow() - timedelta(minutes=1)
        await db.commit()
    assert (
        await client.post("auth/reset-password", json=reset_body)
    ).status_code == 422


async def test_munshi_role_and_read_only_case_access(api):
    client, _, _ = api
    owner = await signup(client)
    created = await client.post(
        "cases",
        headers=bearer(owner),
        json={
            "case_title": "Test case",
            "case_type": "bail_application",
            "petitioner_name": "Test",
        },
    )
    case_id = created.json()["data"]["case"]["id"]
    munshi = await client.post(
        "users/munshis",
        headers=bearer(owner),
        json={
            "email": "assistant@example.com",
            "password": PASSWORD,
            "full_name": "Test Assistant",
        },
    )
    assert munshi.status_code == 201
    munshi_id = munshi.json()["data"]["user"]["id"]
    assistant = (
        await client.post(
            "auth/login",
            json={
                "email": "assistant@example.com",
                "password": PASSWORD,
                "device_type": "android",
            },
        )
    ).json()["data"]
    assert (
        await client.post(
            "cases",
            headers=bearer(assistant),
            json={
                "case_title": "Not allowed",
                "case_type": "bail_application",
                "petitioner_name": "Test",
            },
        )
    ).status_code == 403
    await add_to_personal_chamber(client, owner, munshi_id, "reviewer")
    grant = await client.post(
        f"cases/{case_id}/access",
        headers=bearer(owner),
        json={"user_id": munshi_id, "can_edit": False},
    )
    assert grant.status_code == 201, grant.text
    assert (
        await client.get(f"cases/{case_id}", headers=bearer(assistant))
    ).status_code == 200
    assert (
        await client.get(f"cases/{case_id}/permissions", headers=bearer(assistant))
    ).json()["data"]["can_edit"] is False
    denied = await client.post(
        f"cases/{case_id}/documents/presign",
        headers=bearer(assistant),
        json={
            "filename": "test.pdf",
            "mime_type": "application/pdf",
            "file_size_bytes": 100,
        },
    )
    assert denied.status_code == 403
    outsider = await signup(client, "other@example.com")
    assert (
        await client.patch(
            f"users/munshis/{munshi_id}",
            headers=bearer(outsider),
            json={"is_active": False},
        )
    ).status_code == 404


async def test_web_and_mobile_confirm_view_and_document_isolation(api, monkeypatch):
    """Real PostgreSQL/session routing; synthetic object storage only."""
    client, _, _ = api
    r2 = Mock()
    r2.generate_presigned_url.return_value = "https://storage.example.invalid/original.pdf"
    r2.head_object.return_value = {"ContentLength": 1200}
    monkeypatch.setattr("app.features.documents.service._get_r2_client", lambda: r2)
    native = await signup(client)
    web_response = await client.post("auth/login", json={"email": "lawyer@example.com", "password": PASSWORD})
    web = web_response.json()["data"]
    assert "refresh_token" not in web
    assert web_response.headers.get("set-cookie")
    created = await client.post("cases", headers=bearer(web), json={
        "case_title": "Original file baseline", "case_type": "other", "petitioner_name": "Synthetic",
    })
    case_id = created.json()["data"]["case"]["id"]
    body = {"filename": "synthetic-scan.pdf", "mime_type": "application/pdf", "file_size_bytes": 1200, "client_upload_id": str(uuid.uuid4())}
    presign = await client.post(f"cases/{case_id}/documents/presign", headers=bearer(web), json=body)
    document_id = presign.json()["data"]["document_id"]
    for tokens in (web, native):
        confirmed = await client.post(f"documents/{document_id}/confirm-upload", headers=bearer(tokens), json={})
        assert confirmed.status_code == 200, confirmed.text
        assert set(confirmed.json()["data"]) == {"document"}
        assert confirmed.json()["data"]["document"]["upload_status"] == "uploaded"
        listed = await client.get(f"cases/{case_id}/documents", headers=bearer(tokens))
        assert [doc["id"] for doc in listed.json()["data"]["documents"]] == [document_id]
        view = await client.get(f"documents/{document_id}/view-url", headers=bearer(tokens))
        assert view.status_code == 200, view.text
    retried = await client.post(f"cases/{case_id}/documents/presign", headers=bearer(web), json=body)
    assert retried.json()["data"]["already_uploaded"] is True
    assert retried.json()["data"]["upload_url"] == ""
    outsider = await signup(client, "outsider@example.com")
    for suffix in ("", "/view-url"):
        response = await client.get(f"documents/{document_id}{suffix}", headers=bearer(outsider))
        assert response.status_code == 404
    for method, suffix, payload in (("post", "/confirm-upload", {}), ("patch", "", {"display_name": "Denied"})):
        response = await getattr(client, method)(f"documents/{document_id}{suffix}", headers=bearer(outsider), json=payload)
        assert response.status_code == 403
    response = await client.delete(f"documents/{document_id}", headers=bearer(outsider))
    assert response.status_code == 403
    r2.delete_object.assert_not_called()


async def test_chamber_audit_events_are_payload_free_and_management_scoped(api):
    client, _, _ = api
    owner = await signup(client)
    staff = await signup(client, "audit-staff@example.com")

    created = await client.post(
        "chambers",
        headers=bearer(owner),
        json={"name": "Audit Chamber", "slug": "audit-chamber"},
    )
    assert created.status_code == 201, created.text
    chamber_id = created.json()["data"]["id"]

    created_event = await client.get(
        f"chambers/{chamber_id}/audit-events", headers=bearer(owner)
    )
    assert created_event.status_code == 200, created_event.text
    assert created_event.json()["data"][0]["event_type"] == "chamber.created"
    assert created_event.json()["data"][0]["metadata_json"] == {}

    member = await client.post(
        f"chambers/{chamber_id}/members",
        headers=bearer(owner),
        json={"user_id": staff["user"]["id"], "role": "staff"},
    )
    assert member.status_code == 201, member.text
    membership_id = member.json()["data"]["id"]

    role_change = await client.patch(
        f"chambers/{chamber_id}/members/{membership_id}",
        headers=bearer(owner),
        json={"role": "reviewer"},
    )
    assert role_change.status_code == 200, role_change.text

    events = await client.get(
        f"chambers/{chamber_id}/audit-events", headers=bearer(owner)
    )
    assert events.status_code == 200, events.text
    event_types = [event["event_type"] for event in events.json()["data"]]
    assert event_types[:3] == [
        "membership.role_changed",
        "membership.added",
        "chamber.created",
    ]
    changed = events.json()["data"][0]
    assert changed["subject_user_id"] == staff["user"]["id"]
    assert changed["metadata_json"] == {"previous_role": "staff", "role": "reviewer"}
    assert "email" not in str(events.json()["data"])

    # Permission/lifecycle mutations are recorded against the case without
    # embedding case content or document payloads in the audit row.
    case_headers = {**bearer(owner), "X-Chamber-Id": chamber_id}
    case = await client.post(
        "cases",
        headers=case_headers,
        json={
            "case_title": "Audit case title is not audit payload",
            "case_type": "other",
            "petitioner_name": "Audit petitioner",
        },
    )
    assert case.status_code == 201, case.text
    case_id = case.json()["data"]["case"]["id"]
    grant = await client.post(
        f"cases/{case_id}/access",
        headers=bearer(owner),
        json={"user_id": staff["user"]["id"], "can_edit": False},
    )
    assert grant.status_code == 201, grant.text
    revoke = await client.delete(
        f"cases/{case_id}/access/{staff['user']['id']}", headers=bearer(owner)
    )
    assert revoke.status_code == 200, revoke.text
    archive = await client.delete(f"cases/{case_id}", headers=bearer(owner))
    assert archive.status_code == 200, archive.text

    event_rows = (await client.get(f"chambers/{chamber_id}/audit-events", headers=bearer(owner))).json()["data"]
    by_type = {event["event_type"]: event for event in event_rows}
    assert by_type["case_access.granted"]["resource_id"] == case_id
    assert by_type["case_access.granted"]["subject_user_id"] == staff["user"]["id"]
    assert by_type["case_access.granted"]["metadata_json"] == {"can_edit": False}
    assert by_type["case_access.revoked"]["resource_id"] == case_id
    assert by_type["case.archived"]["resource_id"] == case_id
    assert "Audit case title" not in str(event_rows)

    # A reviewer can work with review flows, but cannot inspect chamber audits.
    assert (
        await client.get(f"chambers/{chamber_id}/audit-events", headers=bearer(staff))
    ).status_code == 403


async def test_chamber_provider_policy_is_versioned_scoped_and_disabled_by_default(api):
    client, _, _ = api
    owner = await signup(client)
    staff = await signup(client, "policy-staff@example.com")
    chambers = await client.get("chambers", headers=bearer(owner))
    chamber_id = chambers.json()["data"][0]["id"]
    await add_to_personal_chamber(client, owner, staff["user"]["id"], "staff")

    default = await client.get(
        f"chambers/{chamber_id}/provider-policy", headers=bearer(owner)
    )
    assert default.status_code == 200, default.text
    assert default.json()["data"] == {
        "id": None,
        "version": 0,
        "external_processing_allowed": False,
        "permitted_data_classes": [],
        "allowed_collection_ids": [],
        "capabilities": {
            "generation": False,
            "review": False,
            "indexing": False,
            "export": False,
        },
        "task_policies": [],
        "created_by_user_id": None,
        "created_at": None,
    }
    assert (
        await client.get(f"chambers/{chamber_id}/provider-policy", headers=bearer(staff))
    ).status_code == 403

    invalid = await client.put(
        f"chambers/{chamber_id}/provider-policy",
        headers=bearer(owner),
        json={
            "external_processing_allowed": False,
            "permitted_data_classes": ["document_text"],
            "capabilities": {},
            "task_policies": [],
        },
    )
    assert invalid.status_code == 422, invalid.text

    policy = {
        "external_processing_allowed": True,
        "permitted_data_classes": ["approved_knowledge", "document_text"],
        "allowed_collection_ids": [str(uuid.uuid4())],
        "capabilities": {"generation": True, "review": True, "indexing": False, "export": False},
        "task_policies": [
            {
                "operation": "summary",
                "providers": [
                    {"provider": "openai", "model": "gpt-5"},
                    {"provider": "gemini", "model": "gemini-2.5-pro"},
                ],
                "permitted_languages": ["hi", "en-in"],
                "max_input_bytes": 2000000,
                "max_output_tokens": 4000,
                "deadline_seconds": 45,
                "max_submissions": 2,
                "run_budget_paise": 5000,
                "fallback_conditions": ["network_error", "rate_limited"],
            },
            {
                "operation": "consistency_check",
                "providers": [{"provider": "claude", "model": "claude-sonnet-4"}],
                "permitted_languages": ["hi"],
                "max_input_bytes": 1000000,
                "max_output_tokens": 1000,
                "deadline_seconds": 30,
                "max_submissions": 1,
                "run_budget_paise": 2500,
                "fallback_conditions": [],
            },
        ],
    }
    created = await client.put(
        f"chambers/{chamber_id}/provider-policy", headers=bearer(owner), json=policy
    )
    assert created.status_code == 200, created.text
    created_data = created.json()["data"]
    assert created_data["version"] == 1
    assert created_data["created_by_user_id"] == owner["user"]["id"]
    assert created_data["task_policies"][0]["providers"][1]["provider"] == "gemini"

    replacement = await client.put(
        f"chambers/{chamber_id}/provider-policy", headers=bearer(owner), json=policy
    )
    assert replacement.status_code == 200, replacement.text
    assert replacement.json()["data"]["version"] == 2
    assert replacement.json()["data"]["id"] != created_data["id"]

    read_current = await client.get(
        f"chambers/{chamber_id}/provider-policy", headers=bearer(owner)
    )
    assert read_current.status_code == 200
    assert read_current.json()["data"]["version"] == 2


async def test_clients_are_chamber_scoped_duplicate_safe_and_link_many_to_many(api):
    client, _, _ = api
    owner = await signup(client)
    outsider = await signup(client, "client-outsider@example.com")
    chamber_id = (await client.get("chambers", headers=bearer(owner))).json()["data"][0]["id"]
    headers = {**bearer(owner), "X-Chamber-Id": chamber_id}

    # Matching names are search assistance only: both legal identities remain.
    first = await client.post(
        "clients", headers=headers, json={"full_name": "Ravi Kumar", "phone": "+91 98765 43210"}
    )
    second = await client.post(
        "clients", headers=headers, json={"full_name": "  ravi   kumar  ", "email": "ravi2@example.com"}
    )
    assert first.status_code == second.status_code == 201
    first_id = first.json()["data"]["id"]
    second_id = second.json()["data"]["id"]
    assert first_id != second_id
    found = await client.get("clients?search=RAVI%20KUMAR", headers=headers)
    assert found.status_code == 200
    assert {row["id"] for row in found.json()["data"]} == {first_id, second_id}
    assert (await client.get("clients", headers=bearer(owner))).status_code == 422
    assert (await client.get("clients", headers={**bearer(outsider), "X-Chamber-Id": chamber_id})).status_code == 404

    create_case_payload = {
        "case_title": "Client links one",
        "case_type": "other",
        "petitioner_name": "Petitioner",
    }
    first_case = await client.post("cases", headers=headers, json=create_case_payload)
    second_case = await client.post(
        "cases", headers=headers, json={**create_case_payload, "case_title": "Client links two"}
    )
    assert first_case.status_code == second_case.status_code == 201
    first_case_id = first_case.json()["data"]["case"]["id"]
    second_case_id = second_case.json()["data"]["case"]["id"]

    linked_one = await client.post(
        f"cases/{first_case_id}/clients",
        headers=headers,
        json={"client_id": first_id, "role": "client"},
    )
    linked_two = await client.post(
        f"cases/{first_case_id}/clients",
        headers=headers,
        json={"client_id": second_id, "role": "co_client"},
    )
    same_client_second_case = await client.post(
        f"cases/{second_case_id}/clients",
        headers=headers,
        json={"client_id": first_id, "role": "representative"},
    )
    assert linked_one.status_code == linked_two.status_code == same_client_second_case.status_code == 201
    assert (
        await client.post(
            f"cases/{first_case_id}/clients",
            headers=headers,
            json={"client_id": first_id},
        )
    ).status_code == 409
    listed = await client.get(f"cases/{first_case_id}/clients", headers=headers)
    assert listed.status_code == 200
    assert [(row["client"]["id"], row["role"]) for row in listed.json()["data"]] == [
        (first_id, "client"),
        (second_id, "co_client"),
    ]
    assert (
        await client.delete(
            f"cases/{first_case_id}/clients/{second_id}", headers=headers
        )
    ).status_code == 200
    assert len((await client.get(f"cases/{first_case_id}/clients", headers=headers)).json()["data"]) == 1

    matter = await client.get(f"matters/{first_case_id}", headers=headers)
    assert matter.status_code == 200, matter.text
    assert matter.json()["data"]["case"]["id"] == first_case_id
    assert matter.json()["data"]["case"]["matter_id"] == first_case_id
    assert matter.json()["data"]["case"]["matter_title"] == "Client links one"
    proceeding = await client.post(
        f"cases/{first_case_id}/proceedings",
        headers=headers,
        json={"title": "High Court bail proceeding", "court_name": "Allahabad High Court"},
    )
    assert proceeding.status_code == 201, proceeding.text
    assert proceeding.json()["data"]["matter_id"] == first_case_id
    listed_proceedings = await client.get(f"cases/{first_case_id}/proceedings", headers=headers)
    assert listed_proceedings.status_code == 200
    assert [row["id"] for row in listed_proceedings.json()["data"]] == [
        proceeding.json()["data"]["id"]
    ]

    pre_filing = await client.post(
        "matters", headers=headers, json={"matter_title": "Pre-filing advice for Ravi", "notes": "Initial conference"}
    )
    assert pre_filing.status_code == 201, pre_filing.text
    pre_filing_data = pre_filing.json()["data"]
    assert pre_filing_data["matter_phase"] == "pre_filing"
    assert pre_filing_data["matter_title"] == "Pre-filing advice for Ravi"
    legacy_matter_view = await client.get(f"matters/{pre_filing_data['id']}", headers=headers)
    assert legacy_matter_view.status_code == 200
    assert legacy_matter_view.json()["data"]["case"]["petitioner_name"] is None
    assert legacy_matter_view.json()["data"]["case"]["respondent_name"] is None


async def test_fee_ledger_is_immutable_and_idempotent(api):
    client, _, _ = api
    owner = await signup(client, "fees-owner@example.com")
    chamber_id = (await client.get("chambers", headers=bearer(owner))).json()["data"][0]["id"]
    headers = {**bearer(owner), "X-Chamber-Id": chamber_id}
    matter = await client.post("matters", headers=headers, json={"matter_title": "Fee test matter"})
    assert matter.status_code == 201
    matter_id = matter.json()["data"]["id"]
    agreement = await client.post(f"matters/{matter_id}/fee-agreements", headers=headers, json={"agreed_amount_paise": 2_500_000})
    assert agreement.status_code == 201, agreement.text
    agreement_id = agreement.json()["data"]["id"]
    async def entry(kind, amount, key):
        return await client.post(f"matters/{matter_id}/fee-agreements/{agreement_id}/entries", headers=headers, json={"entry_type": kind, "amount_paise": amount, "idempotency_key": key})
    payment = await entry("payment", 1_000_000, "fee-payment-0001")
    assert payment.status_code == 201, payment.text
    retry = await entry("payment", 1_000_000, "fee-payment-0001")
    assert retry.status_code == 201
    assert retry.json()["data"]["id"] == payment.json()["data"]["id"]
    assert (await entry("expense", 500_000, "fee-expense-0001")).status_code == 201
    ledger = await client.get(f"matters/{matter_id}/fee-ledger", headers=headers)
    assert ledger.status_code == 200, ledger.text
    assert ledger.json()["data"]["collected_paise"] == 500_000
    assert ledger.json()["data"]["outstanding_paise"] == 2_000_000
