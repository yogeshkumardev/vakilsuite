"""Exercise actual WebSocket ASGI frames without network, database, or paid calls."""

import asyncio
import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.core.exceptions import AppError, AuthInvalidError
from app.features.dictation import realtime
from app.integrations.speech.realtime import RealtimeTranscript
from app.main import app


class Provider:
    def __init__(self):
        self.events = asyncio.Queue()
        self.audio = []
        self.finished = False
        self.closed = False
        self.final_text = "माननीय न्यायालय court"
        self.auto_final = True

    async def start(self):
        pass

    async def send_audio(self, data):
        self.audio.append(data)
        await self.events.put(RealtimeTranscript("partial", "माननीय"))

    async def finish(self):
        self.finished = True
        if self.auto_final:
            await self.events.put(RealtimeTranscript("final", self.final_text))

    async def transcripts(self):
        try:
            while True:
                event = await self.events.get()
                if isinstance(event, Exception):
                    raise event
                yield event
        finally:
            self.closed = True


@pytest.fixture
def dependencies(monkeypatch):
    monkeypatch.setattr(realtime.settings, "CORS_ORIGINS", ["http://127.0.0.1:3000"])
    provider = Provider()
    entered = []
    released = []

    @asynccontextmanager
    async def connect(language, mode):
        entered.append((language, mode))
        try:
            yield provider
        finally:
            released.append(True)

    class Gate:
        check_realtime_rate = AsyncMock()

        @asynccontextmanager
        async def hold(self, user_id, *, ttl_seconds):
            assert ttl_seconds > realtime.settings.SARVAM_REALTIME_MAX_SECONDS + realtime.FINAL_TIMEOUT
            yield

    auth = AsyncMock(return_value=uuid4())
    monkeypatch.setattr(realtime, "authenticate_realtime", auth)
    monkeypatch.setattr(realtime, "connect_sarvam_realtime", connect)
    monkeypatch.setattr(realtime, "get_realtime_gate", Gate)
    return provider, auth, entered, released, Gate


class Socket:
    def __init__(self, origin="http://127.0.0.1:3000"):
        self.incoming = asyncio.Queue()
        self.outgoing = asyncio.Queue()
        self.scope = {
            "type": "websocket", "asgi": {"version": "3.0"}, "scheme": "ws",
            "path": "/api/v1/dictation/realtime", "raw_path": b"/api/v1/dictation/realtime",
            "query_string": b"", "root_path": "", "headers": [(b"origin", origin.encode())],
            "client": ("127.0.0.1", 1234), "server": ("127.0.0.1", 8000), "subprotocols": [],
        }

    async def __aenter__(self):
        self.task = asyncio.create_task(app(self.scope, self.incoming.get, self.outgoing.put))
        await self.incoming.put({"type": "websocket.connect"})
        return self

    async def __aexit__(self, *args):
        self.task.cancel()
        await asyncio.gather(self.task, return_exceptions=True)

    async def receive(self):
        frame = await asyncio.wait_for(self.outgoing.get(), 2)
        if frame["type"] == "websocket.send":
            return json.loads(frame["text"])
        return frame

    async def start(self, **overrides):
        assert (await self.receive())["type"] == "websocket.accept"
        await self.text({"version": 1, "type": "start", "requestId": "test-turn", "token": "offline-test-token", "languageCode": "hi-IN", "mode": "codemix", **overrides})

    async def text(self, value):
        await self.incoming.put({"type": "websocket.receive", "text": json.dumps(value)})

    async def audio(self, data=b"\0\0" * 1600):
        await self.incoming.put({"type": "websocket.receive", "bytes": data})


@pytest.mark.asyncio
async def test_authenticated_stream_partials_and_one_final(dependencies):
    provider, auth, entered, released, _ = dependencies
    async with Socket() as socket:
        await socket.start()
        assert (await socket.receive())["type"] == "ready"
        await socket.audio()
        partial = await socket.receive()
        assert partial == {"version": 1, "requestId": "test-turn", "type": "partial", "text": "माननीय"}
        await socket.text({"type": "stop"})
        final = await socket.receive()
        assert final["type"] == "final" and final["text"] == provider.final_text
        assert (await socket.receive())["type"] == "websocket.close"
    auth.assert_awaited_once_with("offline-test-token")
    assert entered == [("hi-IN", "codemix")] and released == [True]
    assert len(provider.audio) == 1 and provider.finished and provider.closed


@pytest.mark.asyncio
async def test_origin_and_auth_rejections_never_open_provider(dependencies):
    _, auth, entered, _, _ = dependencies
    async with Socket("https://untrusted.example") as socket:
        assert (await socket.receive())["type"] == "websocket.close"
    auth.assert_not_awaited()
    auth.side_effect = AuthInvalidError()
    async with Socket() as socket:
        await socket.start()
        assert (await socket.receive())["code"] == "AUTH_INVALID"
    assert entered == []


@pytest.mark.asyncio
@pytest.mark.parametrize("override", [{"token": ""}, {"languageCode": "invalid"}, {"version": 2}, {"requestId": "a" * 65}])
async def test_invalid_start_never_opens_provider(dependencies, override):
    _, auth, entered, _, _ = dependencies
    async with Socket() as socket:
        await socket.start(**override)
        assert (await socket.receive())["code"] == "DICTATION_INVALID_REQUEST"
    auth.assert_not_awaited()
    assert entered == []


@pytest.mark.asyncio
@pytest.mark.parametrize("during_finalization", [False, True])
async def test_cancel_closes_provider_and_suppresses_late_final(dependencies, during_finalization):
    provider, _, _, released, _ = dependencies
    provider.auto_final = False
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio()
        await socket.receive()
        if during_finalization:
            await socket.text({"type": "stop"})
        await socket.text({"type": "cancel"})
        assert (await socket.receive())["type"] == "websocket.close"
        await provider.events.put(RealtimeTranscript("final", "late result"))
    assert released == [True] and provider.closed


@pytest.mark.asyncio
@pytest.mark.parametrize("data", [b"1", b"\0" * 16_002], ids=["odd", "oversized"])
async def test_invalid_audio_does_not_reach_provider(dependencies, data):
    provider, _, _, _, _ = dependencies
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio(data)
        assert (await socket.receive())["code"] == "DICTATION_INVALID_AUDIO"
    assert provider.audio == []


@pytest.mark.asyncio
async def test_provider_failure_interrupts_capture_without_leaking_details(dependencies):
    provider, _, _, released, _ = dependencies
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await provider.events.put(RuntimeError("secret provider payload"))
        result = await socket.receive()
        assert result["code"] == "DICTATION_UNAVAILABLE"
        assert "secret" not in json.dumps(result)
        await socket.receive()
    assert released == [True]


@pytest.mark.asyncio
async def test_timeout_does_not_hang_finalization(dependencies, monkeypatch):
    provider, _, _, _, _ = dependencies
    provider.auto_final = False
    monkeypatch.setattr(realtime, "FINAL_TIMEOUT", 0.02)
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio()
        await socket.receive()
        await socket.text({"type": "stop"})
        assert (await socket.receive())["code"] == "DICTATION_TIMEOUT"


@pytest.mark.asyncio
async def test_rate_limit_blocks_provider_and_coordination_is_released(dependencies):
    _, _, entered, _, gate = dependencies
    gate.check_realtime_rate.side_effect = AppError("Rate limit", "DICTATION_RATE_LIMIT", 429)
    async with Socket() as socket:
        await socket.start()
        assert (await socket.receive())["code"] == "DICTATION_RATE_LIMIT"
    assert entered == []


@pytest.mark.asyncio
async def test_fast_provider_final_while_stop_send_is_still_returning(dependencies):
    provider, _, _, _, _ = dependencies
    original_finish = provider.finish

    async def delayed_finish():
        await original_finish()
        await asyncio.sleep(0.02)

    provider.finish = delayed_finish
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio()
        await socket.receive()
        await socket.text({"type": "stop"})
        assert (await socket.receive())["type"] == "final"


@pytest.mark.asyncio
async def test_provider_sentence_final_during_recording_is_buffered_until_stop(dependencies):
    provider, _, _, _, _ = dependencies
    provider.auto_final = False
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio()
        assert (await socket.receive())["type"] == "partial"

        await provider.events.put(RealtimeTranscript("final", "पहला वाक्य"))
        preview = await socket.receive()
        assert preview["type"] == "partial" and preview["text"] == "पहला वाक्य"

        await socket.audio()
        assert (await socket.receive())["type"] == "partial"
        await socket.text({"type": "stop"})
        await provider.events.put(RealtimeTranscript("final", "दूसरा वाक्य"))
        result = await socket.receive()
        assert result["type"] == "final"
        assert result["text"] == "पहला वाक्य दूसरा वाक्य"


@pytest.mark.asyncio
async def test_missing_speech_is_not_a_successful_insertion(dependencies):
    provider, _, _, _, _ = dependencies
    provider.final_text = "  "
    async with Socket() as socket:
        await socket.start()
        await socket.receive()
        await socket.audio()
        await socket.receive()
        await socket.text({"type": "stop"})
        assert (await socket.receive())["code"] == "DICTATION_NO_SPEECH"
