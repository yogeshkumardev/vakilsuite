# VakilSuite Android

Mobile companion app for creating cases, scanning documents, and uploading PDFs to the existing VakilSuite backend.

## Development

Use a physical Android phone. Do not install Android Studio or run an emulator for normal development.

```bash
pnpm install
cp .env.example .env
pnpm expo start --dev-client
```

Set `EXPO_PUBLIC_API_URL` in `.env` to your backend LAN URL, for example:

```text
EXPO_PUBLIC_API_URL=http://192.168.1.10:8000/api/v1
```

For the USB-only Lexical editor prototype, also start the Next.js frontend, reverse
port `3000`, and configure:

```text
EXPO_PUBLIC_WEB_APP_URL=http://127.0.0.1:3000
```

From `frontend/`, use `pnpm dev:android`. It binds Next.js to `0.0.0.0`, which is
required for the Windows `adb.exe` reverse tunnel to reach a server running in WSL.

The editor prototype is origin-restricted, passes no account token into the WebView,
and stores non-sensitive test content only for the current WebView session.

Native scanner and SecureStore modules require a development build. Expo Go is not enough for the final scanner flow.

Create a cloud-built APK for the physical phone:

```bash
pnpm dlx eas-cli build --profile development --platform android
```

## Current Scope

- Login and signup with the shared backend account; no email verification gate.
- Forgot/reset password, profile editing, password changes, and device sessions.
- Secure refresh token storage through `expo-secure-store`.
- Serialized refresh on `401`, session revocation, and account-scoped cache cleanup.
- Searchable paginated cases, all case types, minimal case creation and case detail.
- Native scanner, durable SQLite library, thumbnail review, page reorder/removal,
  Original/Balanced/Compact PDFs and sharing.
- Account-isolated foreground upload queue with progress, persisted retry checkpoints,
  stable upload IDs, permission checks, and optional confirmed-file cleanup.
- Foreground/pull-to-refresh and 15-second case/document polling.

See [authentication setup](../AUTH_SETUP.md) for password recovery email, WSL
networking, migrations, permissions, and testing. Expo's Metro tunnel does not
forward the backend API.

See [scanner implementation and phone checklist](../ANDROID_IMPLEMENTATION.md)
for current boundaries and the required updated development APK. A Metro refresh
alone cannot install the newly added native libraries. The app has not yet passed
the physical-phone capture/upload acceptance checklist.

## Backend Contract

The app uses the existing FastAPI backend:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/forgot-password`
- `POST /api/v1/auth/reset-password`
- `POST /api/v1/auth/change-password`
- `GET /api/v1/auth/sessions`
- `DELETE /api/v1/auth/sessions/{session_id}`
- `POST /api/v1/auth/logout-all`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me`
- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/{case_id}`
- `GET /api/v1/cases/{case_id}/documents`
- `POST /api/v1/cases/{case_id}/documents/presign`
- `POST /api/v1/documents/{document_id}/confirm-upload`
