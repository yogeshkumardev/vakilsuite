# Test deployment: Vercel and Render

## What runs where

- Vercel hosts the Next.js application and the browser-side Word editor.
- Render hosts FastAPI, LibreOffice DOCX/PDF conversion, one Celery worker and one Celery beat scheduler.
- Render Postgres stores durable workflow state. Render Key Value carries Celery messages and rate-limit counters.
- Cloudflare R2 remains the private file store.

The Word editor is not a separate Render service. Its source lives in the frontend and its server-side PDF/DOCX conversion uses the API's LibreOffice image.

## Before creating services

1. Push the deployment configuration commit.
2. Create a Render Blueprint from the repository's `render.yaml` on the `master` branch. Keep automatic deploy disabled while testing.
3. Select a paid Render plan for the API and worker if reliable queue processing is required. The worker is deliberately limited to one concurrent job because Gemini and LibreOffice work can be memory intensive.
4. In the generated `vakilsuite-runtime` environment group, set every `sync: false` variable. Do not paste any secret into Git.

Use these values once the stable Vercel URL is known:

```env
AUTH_PUBLIC_WEB_URL=https://YOUR_VERCEL_APP.vercel.app
CORS_ORIGINS=["https://YOUR_VERCEL_APP.vercel.app"]
```

`CORS_ORIGINS` must be JSON, not a comma-separated string. Vercel preview URLs are intentionally not allowed by the API's CSRF guard. Test login and paid workflows using the stable Vercel production URL.

Render supplies `DATABASE_URL` as a standard Postgres URL. The backend normalizes that URL to the `asyncpg` dialect for FastAPI; Celery derives its separate sync driver URL. Run the API first and confirm migrations complete before starting the worker and beat services.

## Vercel configuration

Create one Vercel project from this repository:

- Root Directory: `frontend`
- Enable **Include source files outside of the Root Directory**.
- Vercel reads `frontend/vercel.json`, which uses the editor's pinned pnpm lockfile to build the linked DOCX-editor packages before it installs and builds Next.js. The build command reserves a 4 GB Node heap because declaration generation for the editor is memory-intensive. Do not replace this with a backend deployment: the editor runs in the browser.

Set these Vercel environment variables for Production:

```env
# Keep browser traffic on the Vercel origin. This also covers legacy streaming calls.
NEXT_PUBLIC_API_URL=/api/v1
NEXT_BACKEND_URL=https://YOUR_RENDER_API.onrender.com
API_URL=https://YOUR_RENDER_API.onrender.com/api/v1
NEXT_PUBLIC_GOOGLE_CLIENT_ID=... # only when Google sign-in is enabled
NEXT_PUBLIC_SENTRY_DSN=...       # only when browser Sentry is enabled
```

Redeploy after changing Vercel environment variables. `NEXT_BACKEND_URL` drives the Next.js
`/api/v1` rewrite; the browser must use `NEXT_PUBLIC_API_URL=/api/v1`, not the Render URL.
That keeps authentication cookies first-party and avoids browser third-party-cookie blocking.
The API CORS allowlist must still contain the stable Vercel origin because the backend's CSRF
guard validates browser origins.

## R2 and authentication checks

Configure the R2 bucket CORS policy to allow the stable Vercel origin for `PUT`, `GET`, `HEAD` and the headers used by presigned uploads. The document uploader transfers files directly from the browser to R2.

With the Vercel rewrite, keep `COOKIE_SECURE=true`, `COOKIE_SAMESITE=lax` and `COOKIE_DOMAIN`
empty. Before broader use, move to custom sibling domains such as `app.example.com` and
`api.example.com`; then change cookie settings only after verifying browser behavior.

## Acceptance sequence

1. Open `https://YOUR_RENDER_API.onrender.com/health` and `/docs`.
2. Open Vercel production URL and register/login.
3. Upload one small PDF and confirm R2 transfer succeeds.
4. Start one OCR or fact-card job and confirm it reaches the worker.
5. Generate a summary, then a draft, open the Word editor, and download DOCX and PDF.
6. Confirm Render logs show no CORS, CSRF, R2, provider, migration or LibreOffice errors.

## Operational guardrails

- Keep the API, worker and beat on the same release revision. A deploy that changes task
  code must reach all three services before a new AI job is submitted.
- Do not use a Render cron job in place of Celery beat: retry, stale-state and scheduled
  workflow work is registered in the application scheduler.
- Set a Render log alert for worker exits and API `5xx` responses. Queue delivery is durable,
  but a stopped worker cannot process a queued fact-card, summary or draft job.
- Take a Postgres backup before applying a migration in the testing environment. The API deploy
  runs Alembic before it starts serving traffic.
