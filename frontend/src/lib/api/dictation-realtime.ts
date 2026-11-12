import { getAccessToken, refreshAccessToken } from "./client";
import { useAuthStore } from "@/store/auth.store";
import { createRealtimeChannel, type RealtimeCallbacks } from "./realtime-channel";
import type { DictationLanguage } from "./dictation";

export function dictationSocketUrl(): string {
    const explicit = process.env.NEXT_PUBLIC_DICTATION_WS_URL;
    const api = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
    const url = new URL(explicit || `${api.replace(/\/$/, "")}/dictation/realtime`, window.location.origin);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) throw new Error("Invalid dictation URL protocol.");
    if (!explicit && !api.startsWith("http") && ["127.0.0.1", "localhost"].includes(url.hostname)) {
        url.port = "8000";
    }
    url.protocol = ["https:", "wss:"].includes(url.protocol) ? "wss:" : "ws:";
    if (url.username || url.password || url.search || url.hash) throw new Error("Dictation URL must not contain credentials or query parameters.");
    if (url.protocol === "ws:" && !["127.0.0.1", "localhost"].includes(url.hostname)) {
        throw new Error("Live dictation requires a secure connection.");
    }
    return url.toString();
}

export function connectBrowserDictation(input: RealtimeCallbacks & {
    requestId: string; languageCode: DictationLanguage; isCurrent: () => boolean;
}) {
    const generation = useAuthStore.getState().generation;
    return createRealtimeChannel({
        ...input, url: dictationSocketUrl(), mode: "codemix",
        getToken: async (refresh) => refresh ? refreshAccessToken() : getAccessToken() ?? await refreshAccessToken(),
        isCurrent: () => input.isCurrent() && useAuthStore.getState().generation === generation,
    });
}
