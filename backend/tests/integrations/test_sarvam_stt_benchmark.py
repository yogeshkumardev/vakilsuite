"""Offline tests for Sarvam dictation benchmark metrics and safety gates."""

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from scripts import sarvam_stt_benchmark


def test_word_error_rate_and_critical_terms_support_hindi_codemix() -> None:
    expected = "माननीय न्यायालय में bail application धारा 420 IPC"
    actual = "माननीय न्यायालय में bail application धारा 420"
    assert sarvam_stt_benchmark.word_error_rate(expected, actual) == 0.125
    assert sarvam_stt_benchmark.critical_term_score(
        actual,
        ["माननीय न्यायालय", "bail application", "420", "IPC"],
    ) == (3, 4)


def test_manifest_rejects_audio_outside_its_directory(tmp_path: Path) -> None:
    outside = tmp_path.parent / "outside.wav"
    outside.write_bytes(b"RIFF0000WAVE")
    manifest = tmp_path / "benchmark.json"
    manifest.write_text(
        json.dumps({"samples": [{"audio": "../outside.wav", "expected": "text"}]}),
        encoding="utf-8",
    )
    try:
        sarvam_stt_benchmark.load_manifest(manifest)
    except ValueError as exc:
        assert "inside" in str(exc)
    else:
        raise AssertionError("path traversal should be rejected")


def test_missing_key_stops_before_loading_or_provider_call(tmp_path: Path, capsys) -> None:
    with (
        patch.object(sarvam_stt_benchmark.settings, "SARVAM_API_KEY", ""),
        patch.object(sarvam_stt_benchmark, "load_manifest") as load_manifest,
    ):
        result = sarvam_stt_benchmark.main(
            [str(tmp_path / "missing.json"), "--output", str(tmp_path / "report.json")]
        )
    assert result == 2
    load_manifest.assert_not_called()
    assert "no benchmark calls" in capsys.readouterr().err


def test_benchmark_report_uses_mocked_transcription(tmp_path: Path) -> None:
    clip = tmp_path / "sample.wav"
    clip.write_bytes(b"RIFF0000WAVE")
    samples = [
        {
            "name": "legal-code-mix",
            "category": "code_mix",
            "audio": clip,
            "expected": "धारा 420 IPC",
            "critical_terms": ["420", "IPC"],
        }
    ]
    response = SimpleNamespace(
        transcript="धारा 420 IPC",
        language_code="hi-IN",
        request_id="request-safe",
    )
    with patch.object(
        sarvam_stt_benchmark,
        "transcribe_clip",
        return_value=(response, 500),
    ):
        report = sarvam_stt_benchmark.run_benchmark(samples, "not-printed")
    assert report["mean_word_error_rate"] == 0
    assert report["critical_term_accuracy"] == 1
    assert report["mean_latency_ms"] == 500
