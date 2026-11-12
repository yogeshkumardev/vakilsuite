import { clearSessionTokens, getRefreshToken, saveSessionTokens } from "@/lib/storage/secureTokens";
import { useAuthStore } from "@/store/auth.store";
import { ApiResponse } from "@/types/api";

export const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:8000/api/v1";

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = RequestInit & {
  noAuth?: boolean;
  skipRefresh?: boolean;
  bodyType?: "json" | "form";
  timeoutMs?: number;
};
let refreshPromise: Promise<string | null> | null = null;
let scopeController = new AbortController();

function resetScopeController() {
  scopeController.abort();
  scopeController = new AbortController();
}

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.chamberId !== previous.chamberId) resetScopeController();
});

async function fetchTimed(path: string, init: RequestInit, timeoutMs = 20_000, scopeSignal?: AbortSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortForScopeChange = () => controller.abort();
  scopeSignal?.addEventListener("abort", abortForScopeChange, { once: true });
  try {
    return await fetch(`${API_URL}${path}`, { ...init, credentials: "omit", signal: controller.signal });
  } catch {
    if (scopeSignal?.aborted) throw new ApiError("Working chamber changed. Please retry.", 409, "SCOPE_CHANGED");
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  } finally {
    clearTimeout(timer);
    scopeSignal?.removeEventListener("abort", abortForScopeChange);
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload && !payload.success ? payload.error?.message ?? "Request failed." : `Request failed (${response.status}). Please try again.`,
      response.status,
      payload && !payload.success ? payload.error?.code : undefined,
    );
  }
  return payload.data;
}

export async function clearLocalSession() {
  useAuthStore.getState().clearAuth();
  await clearSessionTokens();
}

export function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  const generation = useAuthStore.getState().generation;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      const response = await fetchTimed("/auth/refresh", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await parseResponse<{ access_token: string; refresh_token: string; session_id: string }>(response);
      if (generation !== useAuthStore.getState().generation) return null;
      await saveSessionTokens(data.refresh_token, data.session_id);
      useAuthStore.getState().setAccessToken(data.access_token);
      return data.access_token;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status) && generation === useAuthStore.getState().generation) {
        await clearLocalSession();
      }
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function waitForRefresh() {
  await refreshPromise?.catch(() => null);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { noAuth, skipRefresh, bodyType = "json", timeoutMs, ...init } = options;
  const { accessToken: token, generation, scopeGeneration } = useAuthStore.getState();
  const headers = new Headers(init.headers);
  if (init.body && bodyType === "json") headers.set("Content-Type", "application/json");
  if (!noAuth && token) headers.set("Authorization", `Bearer ${token}`);
  const chamberId = useAuthStore.getState().chamberId;
  if (!noAuth && chamberId) headers.set("X-Chamber-Id", chamberId);
  const response = await fetchTimed(path, { ...init, headers }, timeoutMs, noAuth ? undefined : scopeController.signal);
  if (!noAuth && scopeGeneration !== useAuthStore.getState().scopeGeneration) {
    throw new ApiError("Working chamber changed. Please retry.", 409, "SCOPE_CHANGED");
  }
  if (!noAuth && generation !== useAuthStore.getState().generation) {
    throw new ApiError("Account changed. Please try again.", 401);
  }
  if (response.status === 401 && !noAuth && !skipRefresh) {
    const currentToken = useAuthStore.getState().accessToken;
    const nextToken = currentToken && currentToken !== token ? currentToken : await refreshAccessToken();
    if (nextToken) return request<T>(path, { ...options, skipRefresh: true });
    await clearLocalSession();
  }
  if (!noAuth && response.status === 401 && skipRefresh) await clearLocalSession();
  const result = await parseResponse<T>(response);
  if (!noAuth && generation !== useAuthStore.getState().generation) throw new ApiError("Account changed. Please try again.", 401);
  if (!noAuth && scopeGeneration !== useAuthStore.getState().scopeGeneration) throw new ApiError("Working chamber changed. Please retry.", 409, "SCOPE_CHANGED");
  return result;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, options?: Pick<RequestOptions, "noAuth" | "skipRefresh">) =>
    request<T>(path, { ...options, method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, { method: "POST", body, bodyType: "form", timeoutMs: 60_000 }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
