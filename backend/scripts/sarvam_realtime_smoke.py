"""One opt-in provider check, without persisting or printing speech content."""

import argparse
import asyncio
from contextlib import suppress
from pathlib import Path
import sys
from time import perf_counter
import wave

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from app.core.exceptions import AppError  # noqa: E402
from app.integrations.speech.realtime import connect_sarvam_realtime  # noqa: E402


def load_pcm(path: Path) -> bytes:
    if path.stat().st_size > 1_000_000:
        raise ValueError("Use a clip of at most 30 seconds.")
    if path.suffix.lower() == ".wav":
        with wave.open(str(path), "rb") as audio:
            if (audio.getnchannels(), audio.getsampwidth(), audio.getframerate()) != (1, 2, 16000):
                raise ValueError("WAV must be mono 16 kHz PCM16.")
            data = audio.readframes(audio.getnframes())
    elif path.suffix.lower() == ".pcm":
        data = path.read_bytes()
    else:
        raise ValueError("Use a WAV or headerless little-endian mono 16 kHz PCM16 file.")
    if not data or len(data) % 2 or len(data) > 30 * 32000:
        raise ValueError("Use 1–30 seconds of mono 16 kHz PCM16.")
    return data


async def check(data: bytes) -> None:
    started = perf_counter()
    async with asyncio.timeout(60), connect_sarvam_realtime("hi-IN", "codemix") as stream:
        await stream.start()

        async def send():
            for offset in range(0, len(data), 3200):
                await stream.send_audio(data[offset:offset + 3200])
                await asyncio.sleep(0.1)
            await stream.finish()

        sender = asyncio.create_task(send())
        partials = 0
        try:
            async for event in stream.transcripts():
                if event.kind == "partial":
                    partials += 1
                elif event.kind == "final":
                    await sender
                    if not event.text.strip():
                        raise ValueError("Provider returned no speech.")
                    print(f"PASS: partials={partials}, final_characters={len(event.text)}, elapsed_seconds={perf_counter() - started:.1f}")
                    return
            raise ValueError("Provider closed before a final transcript.")
        finally:
            sender.cancel()
            with suppress(asyncio.CancelledError):
                await sender


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path)
    parser.add_argument("--allow-live", action="store_true", help="Explicitly authorize one billable Sarvam call.")
    args = parser.parse_args()
    if not args.allow_live:
        print("No request made. Add --allow-live only for an approved non-sensitive sample.")
        return 2
    if not settings.SARVAM_API_KEY.strip():
        print("No request made. Add SARVAM_API_KEY to backend/.env first.")
        return 2
    try:
        asyncio.run(check(load_pcm(args.audio)))
        return 0
    except Exception as exc:
        # Neither exception repr nor provider messages may expose key/audio/text.
        code = exc.code if isinstance(exc, AppError) else type(exc).__name__
        print(f"Streaming smoke failed: {code}. No automatic retry.")
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
