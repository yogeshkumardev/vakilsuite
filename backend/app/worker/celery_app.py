from celery import Celery

from app.core.config import settings

# Celery app configured with Redis broker + backend, bounded retries, JSON serialization.
# task_acks_late=True ensures unacked tasks are re-queued on worker crash (S01-07 requirement).
# task_reject_on_worker_lost=True requeues task if the worker process dies mid-execution.
# worker_prefetch_multiplier=1 gives fair dispatch (one task at a time per worker).

celery_app = Celery(
    "vakilsuite_worker",
    broker=settings.CELERY_BROKER_URL,
    include=["app.worker.tasks.source_ocr", "app.worker.tasks.s528_draft", "app.worker.tasks.dummy", "app.worker.tasks.workflow_resume", "app.worker.tasks.export_working_document", "app.worker.tasks.summary_generation", "app.worker.tasks.legal_research", "app.worker.tasks.auth_email"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_ignore_result=True,
    worker_prefetch_multiplier=1,
    timezone="UTC",
    enable_utc=True,
)

celery_app.conf.beat_schedule = {**(celery_app.conf.beat_schedule or {}), "recover-s528-drafts": {"task": "app.worker.tasks.s528_draft.recover_drafts", "schedule": 15.0}, "recover-auth-email-outbox": {"task": "app.worker.tasks.auth_email.recover_auth_email_outbox", "schedule": 30.0}}
