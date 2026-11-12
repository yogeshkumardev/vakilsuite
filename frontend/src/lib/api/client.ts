import { useAuthStore } from "@/store/auth.store";
import { ApiError } from "@/types/api";
import { useChamberStore } from "@/store/chamber.store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

let _refreshPromise: Promise<string | null> | null = null;
let sessionQueue: Promise<unknown> = Promise.resolve();
let scopeController = new AbortController();
let scopeVersion = 0;

export function cancelScopedRequests() {
    scopeVersion += 1;
    scopeController.abort();
    scopeController = new AbortController();
}

export function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
    const pending = sessionQueue.catch(() => undefined).then(async () => {
        return typeof navigator !== "undefined" && navigator.locks
            ? await navigator.locks.request("vakilsuite-refresh", operation)
            : await operation();
    });
    sessionQueue = pending.catch(() => undefined);
    return pending;
}

const REQUEST_TIMEOUT = 15000; // 15s
const MAX_RETRY = 1;

// ------------------------------------------------------------
// TOKEN MANAGEMENT
// ------------------------------------------------------------

export function setAccessToken(token: string | null) {
    useAuthStore.setState({ accessToken: token });
}

export function getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
}

// ------------------------------------------------------------
// ERROR CLASS
// ------------------------------------------------------------

export class ApiClientError extends Error {
    constructor(
        public code: string,
        message: string,
        public details: Record<string, unknown> = {},
        public status: number = 400,
    ) {
        super(message);
        this.name = "ApiClientError";
    }
}

// ------------------------------------------------------------
// REFRESH TOKEN (LOCKED)
// ------------------------------------------------------------

export async function refreshAccessToken(): Promise<string | null> {
    if (_refreshPromise) return _refreshPromise;

    const generation = useAuthStore.getState().generation;
    const performRefresh = async () => {
        try {
            const res = await fetchWithTimeout(`${API_BASE}/auth/refresh`, {
                method: "POST",
                credentials: "include",
            });

            if (res.status === 401 || res.status === 403) return null;
            if (!res.ok) throw new ApiClientError("AUTH_UNAVAILABLE", "Unable to restore session. Please try again.", {}, res.status);

            const data = await res.json();
            const token = data?.data?.access_token as string;

            if (generation !== useAuthStore.getState().generation) return null;
            if (token) {
                setAccessToken(token);
            }

            return token ?? null;
        } catch (error) {
            if (error instanceof ApiClientError) throw error;
            throw new ApiClientError("NETWORK_ERROR", "Cannot reach the server. Please try again.", {}, 0);
        }
    };
    // Browser tabs share a rotating cookie. Serialize refreshes across tabs too.
    _refreshPromise = withSessionLock(performRefresh).finally(() => { _refreshPromise = null; });

    return _refreshPromise;
}

// ------------------------------------------------------------
// FETCH WITH TIMEOUT
// ------------------------------------------------------------

async function fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeout = REQUEST_TIMEOUT,
    scopeSignal?: AbortSignal,
): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    const abortForScopeChange = () => controller.abort();
    scopeSignal?.addEventListener("abort", abortForScopeChange, { once: true });

    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } finally {
        clearTimeout(id);
        scopeSignal?.removeEventListener("abort", abortForScopeChange);
    }
}

// ------------------------------------------------------------
// REQUEST
// ------------------------------------------------------------

type RequestOptions = {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    noAuth?: boolean;
    retry?: number;
    timeoutMs?: number;
};

export interface DownloadedFile {
    blob: Blob;
    fileName: string;
}

export function fileNameFromDisposition(
    disposition: string | null,
    fallback = "download",
): string {
    if (!disposition) return fallback;

    const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    if (encoded) {
        try {
            return decodeURIComponent(encoded).replace(/[\\/]/g, "-");
        } catch {
            return fallback;
        }
    }

    const quoted = disposition.match(/filename="([^"]+)"/i)?.[1];
    const plain = disposition.match(/filename=([^;]+)/i)?.[1]?.trim();
    return (quoted ?? plain ?? fallback).replace(/[\\/]/g, "-");
}

async function request<T>(
    path: string,
    options: RequestOptions = {},
): Promise<T> {
    const {
        method = "GET",
        body,
        noAuth = false,
        retry = 0,
        timeoutMs = REQUEST_TIMEOUT,
    } = options;

    const token = getAccessToken();
    const generation = useAuthStore.getState().generation;
    const requestScopeVersion = scopeVersion;

    const headers: Record<string, string> = {};

    // Only set JSON header if body exists
    if (body !== undefined) {
        headers["Content-Type"] = "application/json";
    }

    if (!noAuth && token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const chamberId = useChamberStore.getState().selected?.id;
    if (!noAuth && chamberId) headers["X-Chamber-Id"] = chamberId;

    const init: RequestInit = {
        method,
        headers,
        credentials: "include",
    };

    if (body !== undefined) {
        init.body = JSON.stringify(body);
    }

    let res: Response;

    try {
        res = await fetchWithTimeout(`${API_BASE}${path}`, init, timeoutMs, noAuth ? undefined : scopeController.signal);
    } catch (err) {
        if (!noAuth && requestScopeVersion !== scopeVersion) {
            throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
        }
        throw new ApiClientError(
            "NETWORK_ERROR",
            "Network request failed",
            { original_error: String(err) },
            0,
        );
    }

    // ------------------------------------------------------------
    // HANDLE 401 + REFRESH
    // ------------------------------------------------------------

    if (!noAuth && generation !== useAuthStore.getState().generation) {
        throw new ApiClientError("ACCOUNT_CHANGED", "Account changed. Please retry.", {}, 401);
    }
    if (!noAuth && requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }
    if (res.status === 401 && !noAuth && retry < MAX_RETRY) {
        const currentToken = getAccessToken();
        const newToken = currentToken && token !== currentToken ? currentToken : await refreshAccessToken();

        if (newToken) {
            return request<T>(path, {
                ...options,
                retry: retry + 1,
            });
        }

        // logout fallback
        useAuthStore.getState().clearAuth();

        throw new ApiClientError(
            "UNAUTHORIZED",
            "Session expired. Please login again.",
            {},
            401,
        );
    }

    // ------------------------------------------------------------
    // PARSE RESPONSE SAFELY
    // ------------------------------------------------------------

    let json: unknown = null;

    try {
        json = await res.json();
    } catch {
        json = null;
    }

    // ------------------------------------------------------------
    // ERROR HANDLING
    // ------------------------------------------------------------

    if (!res.ok) {
        if (res.status === 401 && !noAuth) useAuthStore.getState().clearAuth();
        let errorCode = "UNKNOWN_ERROR";
        let errorMessage = `HTTP ${res.status}`;
        let errorDetails: Record<string, unknown> = {};

        if (json) {
            if (
                typeof json === "object" &&
                json !== null &&
                "detail" in json &&
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Array.isArray((json as any).detail)
            ) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const detail = (json as any).detail;

                errorCode = "VALIDATION_ERROR";
                const first = detail[0];
                const field =
                    first?.loc?.[first.loc.length - 1] ?? "Field";

                errorMessage = `${field}: ${first?.msg}`;
                errorDetails = { detail };
            } else {
                const errBody = json as ApiError;
                errorCode = errBody?.error?.code ?? errorCode;
                errorMessage = errBody?.error?.message ?? errorMessage;
                errorDetails = errBody?.error?.details ?? {};
            }
        }

        throw new ApiClientError(
            errorCode,
            errorMessage,
            errorDetails,
            res.status,
        );
    }

    if (!noAuth && requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }
    return json as T;
}

async function requestFile(
    path: string,
    body: unknown,
    retry = 0,
): Promise<DownloadedFile> {
    const token = getAccessToken();
    const generation = useAuthStore.getState().generation;
    const requestScopeVersion = scopeVersion;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const chamberId = useChamberStore.getState().selected?.id;
    if (chamberId) headers["X-Chamber-Id"] = chamberId;

    let res: Response;
    try {
        res = await fetchWithTimeout(`${API_BASE}${path}`, {
            method: "POST",
            headers,
            credentials: "include",
            body: JSON.stringify(body),
        }, 60000, scopeController.signal);
    } catch (error) {
        if (requestScopeVersion !== scopeVersion) {
            throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
        }
        throw new ApiClientError(
            "NETWORK_ERROR",
            "Export request failed. Please check the server and try again.",
            { original_error: String(error) },
            0,
        );
    }

    if (generation !== useAuthStore.getState().generation) {
        throw new ApiClientError("ACCOUNT_CHANGED", "Account changed. Please retry.", {}, 401);
    }
    if (requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }

    if (res.status === 401 && retry < MAX_RETRY) {
        const currentToken = getAccessToken();
        const newToken = currentToken && token !== currentToken
            ? currentToken
            : await refreshAccessToken();
        if (newToken) return requestFile(path, body, retry + 1);
        useAuthStore.getState().clearAuth();
        throw new ApiClientError("UNAUTHORIZED", "Session expired. Please login again.", {}, 401);
    }

    if (!res.ok) {
        let code = "EXPORT_FAILED";
        let message = `Export failed (HTTP ${res.status}).`;
        let details: Record<string, unknown> = {};
        try {
            const json = await res.json() as ApiError;
            code = json?.error?.code ?? code;
            message = json?.error?.message ?? message;
            details = json?.error?.details ?? details;
        } catch {
            // Binary endpoints may return an empty/non-JSON proxy error.
        }
        if (res.status === 401) useAuthStore.getState().clearAuth();
        throw new ApiClientError(code, message, details, res.status);
    }

    const blob = await res.blob();
    if (requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }
    return {
        blob,
        fileName: fileNameFromDisposition(
            res.headers.get("content-disposition"),
            "document",
        ),
    };
}

async function requestForm<T>(
    path: string,
    body: FormData,
    retry = 0,
): Promise<T> {
    const token = getAccessToken();
    const generation = useAuthStore.getState().generation;
    const requestScopeVersion = scopeVersion;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const chamberId = useChamberStore.getState().selected?.id;
    if (chamberId) headers["X-Chamber-Id"] = chamberId;

    let res: Response;
    try {
        res = await fetchWithTimeout(`${API_BASE}${path}`, {
            method: "POST",
            headers,
            credentials: "include",
            body,
        }, 60000, scopeController.signal);
    } catch (error) {
        if (requestScopeVersion !== scopeVersion) {
            throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
        }
        throw new ApiClientError(
            "NETWORK_ERROR",
            "Cannot reach dictation. Check your connection and try again.",
            { original_error: String(error) },
            0,
        );
    }

    if (generation !== useAuthStore.getState().generation) {
        throw new ApiClientError("ACCOUNT_CHANGED", "Account changed. Please retry.", {}, 401);
    }
    if (requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }
    if (res.status === 401 && retry < MAX_RETRY) {
        const currentToken = getAccessToken();
        const nextToken = currentToken && currentToken !== token
            ? currentToken
            : await refreshAccessToken();
        if (nextToken) return requestForm<T>(path, body, retry + 1);
        useAuthStore.getState().clearAuth();
    }

    const json = await res.json().catch(() => null) as ApiError | T | null;
    if (!res.ok) {
        if (res.status === 401) useAuthStore.getState().clearAuth();
        const payload = json as ApiError | null;
        throw new ApiClientError(
            payload?.error?.code ?? "DICTATION_FAILED",
            payload?.error?.message ?? `Dictation failed (HTTP ${res.status}).`,
            payload?.error?.details ?? {},
            res.status,
        );
    }
    if (requestScopeVersion !== scopeVersion) {
        throw new ApiClientError("SCOPE_CHANGED", "Working chamber changed. Please retry.", {}, 409);
    }
    return json as T;
}

// ------------------------------------------------------------
// CLIENT
// ------------------------------------------------------------

export const apiClient = {
    get: <T>(path: string) => request<T>(path),

    post: <T>(
        path: string,
        body?: unknown,
        opts?: { noAuth?: boolean; timeoutMs?: number },
    ) => request<T>(path, { method: "POST", body, ...opts }),

    postFile: (path: string, body: unknown) => requestFile(path, body),

    postForm: <T>(path: string, body: FormData) => requestForm<T>(path, body),

    patch: <T>(path: string, body?: unknown) =>
        request<T>(path, { method: "PATCH", body }),

    delete: <T>(path: string) =>
        request<T>(path, { method: "DELETE" }),
};
