FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    DEBIAN_FRONTEND=noninteractive

# This image is intentionally built from the repository root:
#   docker build -f backend/Dockerfile .
# Court blueprints live beside `backend/`, so a backend-only build context
# would publish an API that cannot resolve a court draft at runtime.
WORKDIR /app/backend

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fontconfig \
        fonts-liberation \
        fonts-noto-core \
        libreoffice-writer \
    && rm -rf /var/lib/apt/lists/* \
    && fc-cache -f

RUN pip install --no-cache-dir uv

RUN useradd --create-home appuser

COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --locked --no-dev

COPY --chown=appuser:appuser backend/ ./
COPY --chown=appuser:appuser courts/ /app/courts/
USER appuser

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
