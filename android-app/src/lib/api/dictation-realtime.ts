import { API_URL, refreshAccessToken } from "./client";
import { useAuthStore } from "@/store/auth.store";
import { getEditorWebBaseUrl } from "@/lib/editor/bridge";
import { createRealtimeChannel, type RealtimeCallbacks } from "./realtime-channel";

// RN supports native headers; Expo's DOM typings expose only the browser overload.
const NativeWebSocket = WebSocket as typeof WebSocket & {
  new (url: string, protocols: undefined, options: { headers: Record<string, string> }): WebSocket;
};

export function connectNativeDictation(input: RealtimeCallbacks & {
  requestId: string; languageCode: string; mode: string; isCurrent: () => boolean;
}) {
  const url = new URL(`${API_URL}/dictation/realtime`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Invalid dictation server protocol.");
  if (url.username || url.password || url.search || url.hash) throw new Error("Invalid dictation server URL.");
  if (url.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(url.hostname)) {
    throw new Error("Live dictation requires HTTPS.");
  }
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return createRealtimeChannel({
    ...input, url: url.toString(),
    getToken: async (refresh) => refresh ? refreshAccessToken() : useAuthStore.getState().accessToken ?? await refreshAccessToken(),
    // RN supplies the API's Origin by default. Explicitly use our configured editor
    // origin, which the backend checks against CORS_ORIGINS just like browser clients.
    createSocket: (address) => new NativeWebSocket(address, undefined, { headers: { Origin: new URL(getEditorWebBaseUrl()).origin } }),
  });
}
