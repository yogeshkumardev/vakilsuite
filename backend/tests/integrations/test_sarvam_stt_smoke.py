"""Offline tests for the short Sarvam STT proof harness."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from scripts import sarvam_stt_smoke


def _audio_file(tmp_path: Path) -> Path:
    path = tmp_path / "non-sensitive.wav"
    path.write_bytes(b"RIFF-test-audio")
    return path


def test_missing_key_stops_before_provider_call(tmp_path, capsys) -> None:
    audio_path = _audio_file(tmp_path)
    with (
        patch.object(sarvam_stt_smoke.settings, "SARVAM_API_KEY", ""),
        patch.object(sarvam_stt_smoke, "SarvamAI") as client_class,
    ):
        assert sarvam_stt_smoke.main([str(audio_path)]) == 2

    client_class.assert_not_called()
    assert "SARVAM_API_KEY is missing" in capsys.readouterr().err


def test_success_uses_v4_hindi_codemix_and_prints_evidence(
    tmp_path,
    capsys,
) -> None:
    audio_path = _audio_file(tmp_path)
    client = MagicMock()
    client.speech_to_text.transcribe.return_value = SimpleNamespace(
        transcript="माननीय court",
        language_code="hi-IN",
        request_id="request-1",
    )

    with (
        patch.object(sarvam_stt_smoke.settings, "SARVAM_API_KEY", "secret-key"),
        patch.object(sarvam_stt_smoke.settings, "SARVAM_STT_MODEL", "saaras:v4"),
        patch.object(sarvam_stt_smoke, "SarvamAI", return_value=client),
    ):
        assert sarvam_stt_smoke.main([str(audio_path)]) == 0

    call = client.speech_to_text.transcribe.call_args.kwargs
    assert call["model"] == "saaras:v4"
    assert call["language_code"] == "hi-IN"
    assert call["mode"] == "codemix"
    assert call["file"][0] == "non-sensitive.wav"
    assert call["file"][2] == "audio/wav"
    output = capsys.readouterr().out
    assert "Transcript: माननीय court" in output
    assert "Request ID: request-1" in output
    assert "secret-key" not in output


def test_rejects_unsupported_file_before_provider_call(tmp_path) -> None:
    path = tmp_path / "clip.txt"
    path.write_text("not audio")

    with patch.object(sarvam_stt_smoke, "SarvamAI") as client_class:
        try:
            sarvam_stt_smoke.main([str(path)])
        except SystemExit as exc:
            assert exc.code == 2
        else:
            raise AssertionError("argparse should reject unsupported files")

    client_class.assert_not_called()


def test_accepts_mpeg_audio_suffix(tmp_path) -> None:
    path = tmp_path / "clip.mpeg"
    path.write_bytes(b"test-audio")

    assert sarvam_stt_smoke._audio_path(str(path)) == path.resolve()
    assert sarvam_stt_smoke.AUDIO_CONTENT_TYPES[path.suffix] == "audio/mpeg"
