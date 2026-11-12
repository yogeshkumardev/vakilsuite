import json
import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
import pytest
from app.features.okf_exports import generation as g
from app.features.okf_exports.draft_contract import DraftOutput, editor_from_output
from app.features.jobs.models import JobStatus


def sample():
    output = {
        "sections": [
            {
                "title": "Facts",
                "paragraphs": [
                    {
                        "text": "An allegation is disputed.",
                        "kind": "fact",
                        "fact_ids": ["f1"],
                        "authority_ids": [],
                    }
                ],
            }
        ],
        "missing_facts": [],
    }
    context = {
        "application": {
            "confirmed_facts": [
                {
                    "id": "f1",
                    "citations": [{"source_document_id": "doc1", "page_number": 1}],
                }
            ]
        }
    }
    return output, context


def test_editor_retains_provenance_and_is_unreviewed():
    output, context = sample()
    text = json.dumps(editor_from_output(DraftOutput.model_validate(output), context))
    assert "UNREVIEWED" in text and "doc1" in text and "f1" in text


@pytest.mark.parametrize(
    "change",
    [
        {"fact_ids": ["unknown"]},
        {"fact_ids": []},
        {"authority_ids": ["unknown"]},
        {"text": "https://invented.example"},
    ],
)
def test_rejects_invalid_provenance(change):
    output, context = sample()
    output["sections"][0]["paragraphs"][0].update(change)
    with pytest.raises(ValueError):
        editor_from_output(DraftOutput.model_validate(output), context)


def setup_job(status=JobStatus.queued):
    output, context = sample()
    job = NS(
        id=uuid.uuid4(),
        case_id=uuid.uuid4(),
        chamber_id=uuid.uuid4(),
        owner_id=uuid.uuid4(),
        status=status,
        payload={
            "snapshot_id": str(uuid.uuid4()),
            "request": {
                "expected_manifest_sha256": "a" * 64,
                "fact_bindings": {},
                "requested_relief": "Quash impugned proceedings",
            },
            "quote": {},
        },
        result_summary={},
        error_message=None,
    )
    quote = {
        "model": "test",
        "max_output_tokens": 100,
        "deadline_seconds": 1,
        "estimated_reservation_paise": 1,
        "input_rate": 100,
        "output_rate": 100,
    }
    job.payload["quote"] = quote
    db = NS(
        scalar=AsyncMock(return_value=job),
        get=AsyncMock(
            side_effect=lambda cls, *args, **kw: (
                NS(id=job.owner_id) if cls is g.User else job
            )
        ),
        commit=AsyncMock(),
        flush=AsyncMock(),
        add=Mock(),
    )
    service = g.DraftGenerationService(db)
    service.prepare = AsyncMock(
        return_value=(
            None,
            NS(payload=context, manifest_sha256="a" * 64),
            "prompt",
            quote,
        )
    )
    response = {
        "text": json.dumps(output),
        "finish": "STOP",
        "request_id": "r1",
        "input_tokens": 1,
        "output_tokens": 1,
        "thinking_tokens": 0,
    }
    return service, job, response


@pytest.mark.asyncio
async def test_unknown_dispatch_is_never_repeated(monkeypatch):
    service, job, _ = setup_job(JobStatus.running)
    provider = Mock()
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    provider.assert_not_called()
    service.prepare.assert_not_awaited()


@pytest.mark.asyncio
async def test_timeout_records_unknown_and_does_not_retry(monkeypatch):
    service, job, _ = setup_job()
    provider = Mock(side_effect=TimeoutError())
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    assert job.error_message == "PROVIDER_OUTCOME_UNKNOWN_NO_RETRY"
    await service.execute(job.id)
    assert provider.call_count == 1
    service.db.add.assert_not_called()


@pytest.mark.asyncio
async def test_checkpoint_publishes_without_provider_call(monkeypatch):
    service, job, response = setup_job(JobStatus.running)
    job.payload["response"] = response
    provider = Mock()
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    assert job.status == JobStatus.succeeded
    assert service.db.add.call_count == 2
    assert service.db.add.call_args_list[1].args[0].status.value == "saved"
    provider.assert_not_called()


@pytest.mark.asyncio
async def test_post_call_revocation_blocks_publication(monkeypatch):
    service, job, response = setup_job()
    initial = service.prepare.return_value
    service.prepare.side_effect = [initial, g.ConflictError("revoked")]
    provider = Mock(return_value=response)
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    assert job.status == JobStatus.failed
    assert job.payload["response"] == response
    service.db.add.assert_not_called()
    assert provider.call_count == 1


@pytest.fixture(autouse=True)
def inline_provider_thread(monkeypatch):
    # Keep unit tests deterministic; exercise dispatch boundaries without starting
    # executor threads (the sandbox cannot reliably wake Python's loop at teardown).
    async def inline(fn, **kwargs):
        return fn(**kwargs)

    monkeypatch.setattr(g.asyncio, "to_thread", inline)


@pytest.mark.asyncio
async def test_successful_job_cannot_publish_twice(monkeypatch):
    service, job, response = setup_job()
    provider = Mock(return_value=response)
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    await service.execute(job.id)
    assert job.status == JobStatus.succeeded
    assert provider.call_count == 1
    assert service.db.add.call_count == 2


@pytest.mark.asyncio
async def test_quote_change_prevents_any_paid_submission(monkeypatch):
    service, job, _ = setup_job()
    service.prepare.return_value = (
        *service.prepare.return_value[:3],
        {"model": "changed"},
    )
    provider = Mock()
    monkeypatch.setattr(g, "generate", provider)
    await service.execute(job.id)
    assert job.status == JobStatus.failed
    provider.assert_not_called()


def test_reservation_rounds_up(monkeypatch):
    monkeypatch.setattr(g.settings, "DRAFT_INPUT_PAISE_PER_MILLION", 100)
    monkeypatch.setattr(g.settings, "DRAFT_OUTPUT_PAISE_PER_MILLION", 100)
    assert g.reserve_paise(1, 1) == 1


@pytest.mark.asyncio
async def test_failed_job_can_be_retried(monkeypatch):
    service, job, _ = setup_job(JobStatus.failed)
    job.error_message = "PROVIDER_OUTCOME_UNKNOWN_NO_RETRY"
    service.db.refresh = AsyncMock()
    service.db.commit = AsyncMock()
    service.prepare = AsyncMock(
        return_value=(
            NS(id=uuid.uuid4(), chamber_id=uuid.uuid4()),
            NS(manifest_sha256="m1"),
            "prompt",
            {"quote": 1},
        )
    )
    monkeypatch.setattr(g, "get_or_create_job", AsyncMock(return_value=(job, False)))
    monkeypatch.setattr(g, "fingerprint", lambda x: "h1")
    user = NS(id=uuid.uuid4())
    body = NS(
        expected_quote_hash="h1",
        model_dump=lambda **kwargs: {
            "expected_manifest_sha256": "m1",
            "fact_bindings": {},
            "requested_relief": "r",
        },
    )
    res = await service.submit(
        case_id=uuid.uuid4(), snapshot_id=uuid.uuid4(), user=user, body=body
    )
    assert res.status == JobStatus.queued
    assert res.error_message is None

