"""Opt-in real Redis/PostgreSQL prefork regression, without provider calls.

RUN_WORKER_LOOP_TESTS=1 uv run pytest -q tests/integrations/test_worker_loop_lifecycle.py
Uses a unique queue; never consumes the application's pending OCR jobs.
"""

import os
import uuid

import pytest

if os.environ.get("RUN_WORKER_LOOP_TESTS") != "1":
    pytest.skip(
        "Set RUN_WORKER_LOOP_TESTS=1 for local worker integration",
        allow_module_level=True,
    )

import app.db.registry  # noqa: F401
from app.worker.tasks.source_ocr import transcribe_page
from celery import Celery
from celery.contrib.testing.worker import start_worker
from app.core.config import settings

probe_app = Celery(
    "loop_probe",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_BROKER_URL,
    include=("tests.integrations.test_worker_loop_lifecycle",),
)
probe_app.conf.update(
    task_default_queue=f"loop-probe-{uuid.uuid4()}", worker_prefetch_multiplier=1
)


@probe_app.task(shared=False, ignore_result=False)
def probe():
    # A missing ID performs the real OCR DB lookup and exits before provider IO.
    transcribe_page.run(str(uuid.uuid4()))
    return os.getpid()


def test_three_ocr_tasks_in_same_prefork_process():
    with start_worker(
        probe_app,
        pool="prefork",
        concurrency=1,
        perform_ping_check=False,
        shutdown_timeout=15,
        loglevel="INFO",
    ):
        results = []
        pids = []
        try:
            for _ in range(3):
                result = probe.apply_async(queue=probe_app.conf.task_default_queue)
                results.append(result)
                pids.append(result.get(timeout=30))
            assert len(set(pids)) == 1
            assert pids[0] != os.getpid()
        finally:
            for result in results:
                result.forget()
