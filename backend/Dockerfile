FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    DEBIAN_FRONTEND=noninteractive

WORKDIR /app

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

COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev

COPY --chown=appuser:appuser . .
USER appuser

EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
