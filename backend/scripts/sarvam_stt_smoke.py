"""Transcribe one non-sensitive short clip with Sarvam Saaras."""

import argparse
import sys
from pathlib import Path
from time import perf_counter
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sarvamai import SarvamAI  # noqa: E402

from app.core.config import settings  # noqa: E402

SUPPORTED_SUFFIXES = {
    ".aac",
    ".aiff",
    ".amr",
    ".flac",
    ".m4a",
    ".mp3",
    ".mpeg",
    ".mp4",
    ".ogg",
    ".opus",
    ".wav",
    ".webm",
    ".wma",
}

AUDIO_CONTENT_TYPES = {
    ".aac": "audio/aac",
    ".aiff": "audio/aiff",
    ".amr": "audio/amr",
    ".flac": "audio/flac",
    ".m4a": "audio/mp4",
    ".mp3": "audio/mpeg",
    ".mpeg": "audio/mpeg",
    ".mp4": "audio/mp4",
    ".ogg": "audio/ogg",
    ".opus": "audio/ogg",
    ".wav": "audio/wav",
    ".webm": "audio/webm",
    ".wma": "audio/x-ms-wma",
}


def transcribe_clip(audio_path: Path, api_key: str, model: str) -> tuple[Any, int]:
    """Submit one short clip and return its SDK response and elapsed time."""
    client = SarvamAI(api_subscription_key=api_key)
    started_at = perf_counter()
    with audio_path.open("rb") as audio_file:
        response = client.speech_to_text.transcribe(
            file=(
                audio_path.name,
                audio_file,
                AUDIO_CONTENT_TYPES[audio_path.suffix.lower()],
            ),
            model=model,
            language_code="hi-IN",
            mode="codemix",
        )
    elapsed_ms = round((perf_counter() - started_at) * 1000)
    return response, elapsed_ms


def _audio_path(value: str) -> Path:
    path = Path(value).expanduser().resolve()
    if not path.is_file():
        raise argparse.ArgumentTypeError("audio file does not exist")
    if path.suffix.lower() not in SUPPORTED_SUFFIXES:
        raise argparse.ArgumentTypeError("unsupported audio file extension")
    if path.stat().st_size == 0:
        raise argparse.ArgumentTypeError("audio file is empty")
    return path


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run one Sarvam STT call using a non-sensitive clip under 30 seconds."
    )
    parser.add_argument("audio", type=_audio_path)
    args = parser.parse_args(argv)

    api_key = settings.SARVAM_API_KEY.strip()
    if not api_key:
        print(
            "SARVAM_API_KEY is missing. Add it to backend/.env and run again.",
            file=sys.stderr,
        )
        return 2

    try:
        response, elapsed_ms = transcribe_clip(
            args.audio,
            api_key,
            settings.SARVAM_STT_MODEL,
        )
    except Exception as exc:  # Provider details may contain sensitive request context.
        print(f"Sarvam STT smoke call failed ({type(exc).__name__}).", file=sys.stderr)
        return 1

    transcript = response.transcript.strip()
    if not transcript:
        print("Sarvam returned an empty transcript.", file=sys.stderr)
        return 1

    print(f"Transcript: {transcript}")
    print(f"Language: {response.language_code or 'unknown'}")
    print(f"Request ID: {response.request_id or 'unavailable'}")
    print(f"Latency: {elapsed_ms} ms")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
