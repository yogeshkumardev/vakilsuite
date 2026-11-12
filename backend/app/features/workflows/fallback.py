"""Deterministic, policy-bounded provider fallback for workflow POCs.

This module intentionally has no provider SDK dependency. It proves the
decision rules that future real adapters must obey: one approved submission at
a time, a workflow-scoped shared budget, and no blind retry after ambiguity.
"""

from __future__ import annotations

import enum
import threading
import time
from dataclasses import dataclass, field
from typing import Callable, Protocol


class FailureKind(str, enum.Enum):
    unavailable = "unavailable"
    rate_limited = "rate_limited"
    invalid_output = "invalid_output"
    refused = "refused"
    authentication = "authentication"
    unknown_outcome = "unknown_outcome"
    budget_exhausted = "budget_exhausted"


@dataclass(frozen=True)
class ProviderAttempt:
    provider: str
    success: bool
    output: str | None = None
    failure: FailureKind | None = None


class POCProvider(Protocol):
    name: str

    def invoke(self, request_digest: str) -> ProviderAttempt: ...


@dataclass(frozen=True)
class FallbackOutcome:
    output: str | None
    attempts: tuple[ProviderAttempt, ...]
    terminal_failure: FailureKind | None = None
    skipped_open_circuits: tuple[str, ...] = ()


@dataclass
class SharedSubmissionBudget:
    """Thread-safe, workflow-scoped cap shared by every provider attempt."""

    maximum: int
    consumed: int = 0
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def __post_init__(self) -> None:
        if self.maximum < 1:
            raise ValueError("shared submission budget must be positive")

    def reserve(self) -> bool:
        with self._lock:
            if self.consumed >= self.maximum:
                return False
            self.consumed += 1
            return True

    @property
    def remaining(self) -> int:
        with self._lock:
            return self.maximum - self.consumed


class CircuitBreaker:
    """Small in-memory POC circuit breaker; durable health is a later concern."""

    def __init__(
        self,
        *,
        failure_threshold: int = 2,
        cooldown_seconds: float = 30.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if failure_threshold < 1 or cooldown_seconds <= 0:
            raise ValueError("circuit breaker threshold and cooldown must be positive")
        self._threshold = failure_threshold
        self._cooldown_seconds = cooldown_seconds
        self._clock = clock
        self._consecutive_failures: dict[str, int] = {}
        self._open_until: dict[str, float] = {}

    def is_open(self, provider: str) -> bool:
        open_until = self._open_until.get(provider)
        return open_until is not None and open_until > self._clock()

    def record_success(self, provider: str) -> None:
        self._consecutive_failures.pop(provider, None)
        self._open_until.pop(provider, None)

    def record_failure(self, provider: str, failure: FailureKind) -> None:
        # A known, retryable failure proves no request completed; count it.
        # Unknown outcome/refusal/authentication stops before this method.
        if failure not in BoundedFallbackRouter._CIRCUIT_BREAKING_FAILURES:
            return
        count = self._consecutive_failures.get(provider, 0) + 1
        self._consecutive_failures[provider] = count
        if count >= self._threshold:
            self._open_until[provider] = self._clock() + self._cooldown_seconds


class BoundedFallbackRouter:
    """Try eligible approved providers once, within an explicit shared budget."""

    _FALLBACK_ELIGIBLE = {
        FailureKind.unavailable,
        FailureKind.rate_limited,
        FailureKind.invalid_output,
    }
    _CIRCUIT_BREAKING_FAILURES = {FailureKind.unavailable, FailureKind.rate_limited}
    _STOP_IMMEDIATELY = {
        FailureKind.refused,
        FailureKind.authentication,
        FailureKind.unknown_outcome,
    }

    def __init__(
        self,
        providers: list[POCProvider],
        *,
        max_submissions: int | None = None,
        shared_budget: SharedSubmissionBudget | None = None,
        circuit_breaker: CircuitBreaker | None = None,
    ) -> None:
        if not providers:
            raise ValueError("At least one approved provider is required")
        if max_submissions is None:
            max_submissions = min(3, len(providers))
        if not 1 <= max_submissions <= len(providers):
            raise ValueError("max_submissions must be between 1 and provider count")
        names = [provider.name for provider in providers]
        if len(set(names)) != len(names):
            raise ValueError("Providers must have unique names")
        self._providers = providers
        self._max_submissions = max_submissions
        self._budget = shared_budget or SharedSubmissionBudget(maximum=max_submissions)
        self._circuit_breaker = circuit_breaker or CircuitBreaker()

    def invoke(self, request_digest: str) -> FallbackOutcome:
        attempts: list[ProviderAttempt] = []
        skipped_open_circuits: list[str] = []
        for provider in self._providers:
            if len(attempts) >= self._max_submissions:
                break
            if self._circuit_breaker.is_open(provider.name):
                skipped_open_circuits.append(provider.name)
                continue
            if not self._budget.reserve():
                return FallbackOutcome(
                    None,
                    tuple(attempts),
                    FailureKind.budget_exhausted,
                    tuple(skipped_open_circuits),
                )
            attempt = provider.invoke(request_digest)
            if attempt.provider != provider.name:
                raise ValueError("Provider attempt name must match its adapter")
            attempts.append(attempt)
            if attempt.success:
                if not attempt.output:
                    raise ValueError("Successful provider attempt requires output")
                self._circuit_breaker.record_success(provider.name)
                return FallbackOutcome(
                    output=attempt.output,
                    attempts=tuple(attempts),
                    skipped_open_circuits=tuple(skipped_open_circuits),
                )
            if attempt.failure is None:
                raise ValueError("Failed provider attempt requires failure kind")
            if attempt.failure in self._STOP_IMMEDIATELY:
                return FallbackOutcome(
                    None,
                    tuple(attempts),
                    attempt.failure,
                    tuple(skipped_open_circuits),
                )
            if attempt.failure not in self._FALLBACK_ELIGIBLE:
                return FallbackOutcome(
                    None,
                    tuple(attempts),
                    attempt.failure,
                    tuple(skipped_open_circuits),
                )
            self._circuit_breaker.record_failure(provider.name, attempt.failure)

        if not attempts and skipped_open_circuits:
            return FallbackOutcome(None, (), FailureKind.unavailable, tuple(skipped_open_circuits))
        return FallbackOutcome(
            None,
            tuple(attempts),
            attempts[-1].failure if attempts else FailureKind.budget_exhausted,
            tuple(skipped_open_circuits),
        )
