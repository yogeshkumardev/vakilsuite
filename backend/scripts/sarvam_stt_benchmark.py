"""Run an explicit, non-sensitive Sarvam dictation quality benchmark."""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.config import settings  # noqa: E402
from scripts.sarvam_stt_smoke import _audio_path, transcribe_clip  # noqa: E402


@dataclass(frozen=True)
class SampleResult:
    name: str
    category: str
    expected: str
    actual: str
    word_error_rate: float
    critical_terms_total: int
    critical_terms_matched: int
    latency_ms: int
    language_code: str
    provider_request_id: str | None


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).casefold()
    return " ".join(
        "".join(
            char
            if char.isalnum() or unicodedata.category(char).startswith("M")
            else " "
            for char in normalized
        ).split()
    )


def word_error_rate(expected: str, actual: str) -> float:
    reference = normalize_text(expected).split()
    hypothesis = normalize_text(actual).split()
    if not reference:
        return 0.0 if not hypothesis else 1.0
    previous = list(range(len(hypothesis) + 1))
    for row, reference_word in enumerate(reference, start=1):
        current = [row]
        for column, hypothesis_word in enumerate(hypothesis, start=1):
            current.append(
                min(
                    current[column - 1] + 1,
                    previous[column] + 1,
                    previous[column - 1] + (reference_word != hypothesis_word),
                )
            )
        previous = current
    return round(previous[-1] / len(reference), 4)


def critical_term_score(actual: str, terms: list[str]) -> tuple[int, int]:
    normalized_actual = normalize_text(actual)
    matched = sum(normalize_text(term) in normalized_actual for term in terms)
    return matched, len(terms)


def load_manifest(path: Path) -> list[dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    samples = payload.get("samples") if isinstance(payload, dict) else None
    if not isinstance(samples, list) or not samples:
        raise ValueError("manifest must contain a non-empty samples list")

    root = path.parent.resolve()
    validated: list[dict[str, Any]] = []
    for index, sample in enumerate(samples, start=1):
        if not isinstance(sample, dict):
            raise ValueError(f"sample {index} must be an object")
        audio_value = sample.get("audio")
        expected = sample.get("expected")
        if not isinstance(audio_value, str) or not isinstance(expected, str) or not expected.strip():
            raise ValueError(f"sample {index} requires audio and expected text")
        audio_path = (root / audio_value).resolve()
        if not audio_path.is_relative_to(root):
            raise ValueError(f"sample {index} audio must stay inside the manifest directory")
        terms = sample.get("critical_terms", [])
        if not isinstance(terms, list) or not all(isinstance(term, str) for term in terms):
            raise ValueError(f"sample {index} critical_terms must be a string list")
        validated.append(
            {
                "name": str(sample.get("name") or audio_path.stem),
                "category": str(sample.get("category") or "unspecified"),
                "audio": _audio_path(str(audio_path)),
                "expected": expected.strip(),
                "critical_terms": terms,
            }
        )
    return validated


def run_benchmark(samples: list[dict[str, Any]], api_key: str) -> dict[str, Any]:
    results: list[SampleResult] = []
    for sample in samples:
        response, latency_ms = transcribe_clip(
            sample["audio"],
            api_key,
            settings.SARVAM_STT_MODEL,
        )
        actual = str(response.transcript or "").strip()
        matched, total = critical_term_score(actual, sample["critical_terms"])
        results.append(
            SampleResult(
                name=sample["name"],
                category=sample["category"],
                expected=sample["expected"],
                actual=actual,
                word_error_rate=word_error_rate(sample["expected"], actual),
                critical_terms_total=total,
                critical_terms_matched=matched,
                latency_ms=latency_ms,
                language_code=str(response.language_code or "unknown"),
                provider_request_id=getattr(response, "request_id", None),
            )
        )

    total_terms = sum(result.critical_terms_total for result in results)
    matched_terms = sum(result.critical_terms_matched for result in results)
    return {
        "model": settings.SARVAM_STT_MODEL,
        "language_code": "hi-IN",
        "mode": "codemix",
        "sample_count": len(results),
        "mean_word_error_rate": round(
            sum(result.word_error_rate for result in results) / len(results),
            4,
        ),
        "critical_term_accuracy": round(matched_terms / total_terms, 4)
        if total_terms
        else None,
        "mean_latency_ms": round(sum(result.latency_ms for result in results) / len(results)),
        "samples": [asdict(result) for result in results],
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Run paid/free-credit Sarvam calls only for explicitly listed non-sensitive clips."
    )
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args(argv)

    api_key = settings.SARVAM_API_KEY.strip()
    if not api_key:
        print("SARVAM_API_KEY is missing; no benchmark calls were made.", file=sys.stderr)
        return 2
    try:
        samples = load_manifest(args.manifest.resolve())
        report = run_benchmark(samples, api_key)
    except Exception as exc:
        print(f"Benchmark stopped ({type(exc).__name__}); review the manifest or provider status.", file=sys.stderr)
        return 1

    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Benchmark complete: {report['sample_count']} samples")
    print(f"Mean WER: {report['mean_word_error_rate']:.2%}")
    if report["critical_term_accuracy"] is not None:
        print(f"Critical-term accuracy: {report['critical_term_accuracy']:.2%}")
    print(f"Mean latency: {report['mean_latency_ms']} ms")
    print(f"Report: {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
