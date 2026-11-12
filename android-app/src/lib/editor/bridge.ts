export const EDITOR_BRIDGE_VERSION = 1 as const;
export const DEFAULT_EDITOR_WEB_URL = "http://127.0.0.1:3000";

export type EditorBridgeMessage =
  | { version: 1; type: "ready" }
  | { version: 1; type: "dirty"; dirty: boolean }
  | { version: 1; type: "saved"; characterCount: number; savedAt: string }
  | { version: 1; type: "error"; message: string }
  | {
      version: 1;
      type: "dictation.start";
      requestId: string;
      languageCode: "hi-IN" | "en-IN" | "unknown";
      mode: "codemix" | "transcribe";
    }
  | { version: 1; type: "dictation.stop"; requestId: string }
  | { version: 1; type: "dictation.cancel"; requestId: string };

export type NativeEditorMessage = { requestId: string } & (
  | { version: 1; type: "dictation.status"; status: "recording" | "transcribing" | "idle" }
  | { version: 1; type: "dictation.result"; transcript: string }
  | { version: 1; type: "dictation.partial"; transcript: string }
  | { version: 1; type: "dictation.error"; message: string });

function parseBaseUrl(value: string): URL {
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Editor URL must use HTTP or HTTPS.");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Editor URL must not contain credentials.");
  }
  const isLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
  if (parsed.protocol === "http:" && !isLoopback) {
    throw new Error("Non-local editor URLs must use HTTPS.");
  }
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.search = "";
  parsed.hash = "";
  return parsed;
}

export function getEditorWebBaseUrl(
  configured = process.env.EXPO_PUBLIC_WEB_APP_URL ?? DEFAULT_EDITOR_WEB_URL,
): string {
  return parseBaseUrl(configured).toString().replace(/\/$/, "");
}

export function getEditorSpikeUrl(configured?: string): string {
  const url = new URL(`${getEditorWebBaseUrl(configured)}/spike-editor`);
  url.searchParams.set("embedded", "1");
  return url.toString();
}

export function getEditorSessionUrl(sessionId: string, bootstrapToken: string, configured?: string): string {
  const url = new URL(`${getEditorWebBaseUrl(configured)}/editor-session/${sessionId}`);
  url.searchParams.set("embedded", "1");
  // A fragment never reaches the web server/referrer logs. The restricted
  // page consumes it once and clears it from the address bar/history.
  url.hash = `bootstrap=${encodeURIComponent(bootstrapToken)}`;
  return url.toString();
}

export function isAllowedEditorNavigation(requestUrl: string, configured?: string): boolean {
  if (requestUrl === "about:blank") return true;
  try {
    return new URL(requestUrl).origin === new URL(getEditorWebBaseUrl(configured)).origin;
  } catch {
    return false;
  }
}

export function parseEditorBridgeMessage(raw: string): EditorBridgeMessage | null {
  if (raw.length > 2_048) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const message = value as Record<string, unknown>;
    if (message.version !== EDITOR_BRIDGE_VERSION || typeof message.type !== "string") return null;

    if (message.type === "ready") return { version: 1, type: "ready" };
    if (message.type === "dirty" && typeof message.dirty === "boolean") {
      return { version: 1, type: "dirty", dirty: message.dirty };
    }
    if (
      message.type === "saved" &&
      typeof message.characterCount === "number" &&
      Number.isInteger(message.characterCount) &&
      message.characterCount >= 0 &&
      typeof message.savedAt === "string"
    ) {
      return {
        version: 1,
        type: "saved",
        characterCount: message.characterCount,
        savedAt: message.savedAt,
      };
    }
    if (message.type === "error" && typeof message.message === "string") {
      return { version: 1, type: "error", message: message.message.slice(0, 240) };
    }
    if (
      message.type === "dictation.start" &&
      typeof message.requestId === "string" && message.requestId.length > 0 && message.requestId.length <= 64 &&
      ["hi-IN", "en-IN", "unknown"].includes(String(message.languageCode)) &&
      ["codemix", "transcribe"].includes(String(message.mode))
    ) {
      return {
        version: 1,
        type: "dictation.start",
        requestId: message.requestId,
        languageCode: message.languageCode as "hi-IN" | "en-IN" | "unknown",
        mode: message.mode as "codemix" | "transcribe",
      };
    }
    if (typeof message.requestId === "string" && message.requestId.length > 0 && message.requestId.length <= 64) {
      if (message.type === "dictation.stop") return { version: 1, type: "dictation.stop", requestId: message.requestId };
      if (message.type === "dictation.cancel") return { version: 1, type: "dictation.cancel", requestId: message.requestId };
    }
  } catch {
    return null;
  }
  return null;
}

export function serializeNativeEditorMessage(message: NativeEditorMessage): string {
  if (message.type === "dictation.result" || message.type === "dictation.partial") {
    return JSON.stringify({ ...message, transcript: message.transcript.slice(0, 50_000) });
  }
  if (message.type === "dictation.error") {
    return JSON.stringify({ ...message, message: message.message.slice(0, 240) });
  }
  return JSON.stringify(message);
}
