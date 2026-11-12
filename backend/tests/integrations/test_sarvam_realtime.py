import base64
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError
from app.features.dictation.service import DictationRequestGate
from app.integrations.speech import realtime


@pytest.mark.asyncio
async def test_provider_requires_accepted_session_and_sends_pcm():
    socket = MagicMock()
    socket.recv = AsyncMock(return_value=SimpleNamespace(event="session.begin"))
    socket.send_realtime_speech_start = AsyncMock()
    socket.send_realtime_audio_input = AsyncMock()
    socket.send_realtime_speech_end = AsyncMock()
    session = realtime.SarvamRealtimeSession(socket)
    await session.start()
    await session.send_audio(b"\x00\x01")
    await session.finish()
    socket.send_realtime_speech_start.assert_awaited_once()
    assert base64.b64decode(socket.send_realtime_audio_input.call_args.args[0].audio) == b"\x00\x01"
    socket.send_realtime_speech_end.assert_awaited_once()
    socket.recv.return_value = SimpleNamespace(event="error", status_code=429)
    with pytest.raises(AppError) as exc:
        await session.start()
    assert exc.value.code == "DICTATION_QUOTA_EXHAUSTED"


@pytest.mark.asyncio
async def test_no_key_never_connects(monkeypatch):
    monkeypatch.setattr(realtime.settings, "SARVAM_API_KEY", "")
    client = MagicMock()
    monkeypatch.setattr(realtime, "AsyncSarvamAI", client)
    with pytest.raises(AppError) as exc:
        async with realtime.connect_sarvam_realtime("hi-IN", "codemix"):
            pytest.fail("must fail before connection")
    assert exc.value.code == "DICTATION_NOT_CONFIGURED"
    client.assert_not_called()


@pytest.mark.asyncio
async def test_provider_outputs_are_bounded_and_errors_sanitized():
    class Socket:
        def __init__(self, events):
            self.events = events

        async def __aiter__(self):
            for event in self.events:
                yield SimpleNamespace(**event)

    session = realtime.SarvamRealtimeSession(Socket([
        {"event": "transcript.partial", "text": "माननीय"},
        {"event": "transcript.final", "text": "न्यायालय"},
        {"event": "session.end"},
    ]))
    assert [(e.kind, e.text) async for e in session.transcripts()] == [("partial", "माननीय"), ("final", "न्यायालय")]
    for event in [
        {"event": "transcript.final", "text": "a" * 50001},
        {"event": "error", "status_code": 403, "message": "private provider details"},
    ]:
        with pytest.raises(AppError) as exc:
            _ = [e async for e in realtime.SarvamRealtimeSession(Socket([event])).transcripts()]
        assert "private" not in exc.value.message


@pytest.mark.asyncio
async def test_realtime_rate_limit_fails_closed_and_gate_releases_on_error():
    gate = object.__new__(DictationRequestGate)
    gate._redis = MagicMock()
    gate._redis.set = AsyncMock(return_value=True)
    gate._redis.eval = AsyncMock(return_value=31)
    with pytest.raises(AppError) as exc:
        async with gate.hold(uuid4(), ttl_seconds=97):
            await gate.check_realtime_rate(uuid4())
    assert exc.value.code == "DICTATION_RATE_LIMIT"
    assert gate._redis.set.call_args.kwargs["ex"] == 97
    assert gate._redis.eval.await_count == 2  # Rate increment and guarded lock release.
    gate._redis.eval.side_effect = ConnectionError()
    with pytest.raises(AppError) as exc:
        await gate.check_realtime_rate(uuid4())
    assert exc.value.code == "DICTATION_COORDINATION_UNAVAILABLE"
