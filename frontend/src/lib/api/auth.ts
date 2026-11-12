import { ApiResponse, AuthTokens, User } from "@/types/api";
import { apiClient, refreshAccessToken, withSessionLock } from "./client";
import { useAuthStore } from "@/store/auth.store";

export interface DeviceSession {
  id: string;
  device_type: string;
  device_name: string | null;
  last_seen_at: string;
  created_at: string;
}
export interface VerificationPending { status: "verification_pending"; verification_flow: string | null; message: string; }

// ------------------------------------------------------------
// HELPERS (CRITICAL)
// ------------------------------------------------------------

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) {
    throw new Error(res.error.message);
  }
  return res.data;
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const authApi = {
  // ------------------------------------------------------------
  // REGISTER
  // ------------------------------------------------------------
  register: async (
    email: string,
    password: string,
    full_name: string,
  ) => {
    const res = await apiClient.post<ApiResponse<VerificationPending>>(
      "/auth/register",
      {
        email,
        password,
        full_name,
        device_type: "web",
        device_name: "Web browser",
      },
      { noAuth: true },
    );

    return unwrap(res);
  },
  requestEmailVerification: async (email: string) => unwrap(await apiClient.post<ApiResponse<VerificationPending>>("/auth/email-verification/request", { email }, { noAuth: true })),
  confirmEmailVerification: async (flow: string, code: string) => unwrap(await apiClient.post<ApiResponse<{ message: string }>>("/auth/email-verification/confirm", { flow, code }, { noAuth: true })),

  // ------------------------------------------------------------
  // LOGIN
  // ------------------------------------------------------------
  login: async (email: string, password: string) => {
    const res = await apiClient.post<ApiResponse<AuthTokens>>(
      "/auth/login",
      { email, password, device_type: "web", device_name: "Web browser" },
      { noAuth: true },
    );

    return unwrap(res);
  },

  // ------------------------------------------------------------
  // GOOGLE LOGIN
  // ------------------------------------------------------------
  loginWithGoogle: async (id_token: string) => {
    const res = await apiClient.post<ApiResponse<AuthTokens>>(
      "/auth/login/google",
      { id_token, device_type: "web", device_name: "Web browser" },
      { noAuth: true },
    );

    return unwrap(res);
  },

  // ------------------------------------------------------------
  // LOGOUT
  // ------------------------------------------------------------
  logout: () => withSessionLock(async () => {
    const res = await apiClient.post<ApiResponse<Record<string, never>>>(
      "/auth/logout",
      undefined,
      { noAuth: true },
    );

    const data = unwrap(res);
    useAuthStore.getState().clearAuth();
    return data;
  }),

  // ------------------------------------------------------------
  // ME
  // ------------------------------------------------------------
  me: async () => {
    const res = await apiClient.get<ApiResponse<User>>("/users/me");
    return unwrap(res);
  },

  // ------------------------------------------------------------
  // UPDATE PROFILE
  // ------------------------------------------------------------
  updateProfile: async (data: Partial<User>) => {
    const res = await apiClient.patch<ApiResponse<User>>(
      "/users/me/profile",
      data,
    );
    return unwrap(res);
  },

  // ------------------------------------------------------------
  // CHANGE PASSWORD
  // ------------------------------------------------------------
  changePassword: async (
    current_password: string,
    new_password: string,
  ) => {
    const res = await apiClient.post<ApiResponse<{ message: string }>>(
      "/auth/change-password",
      {
        current_password,
        new_password,
      },
    );

    const data = unwrap(res);
    useAuthStore.getState().clearAuth();
    return data;
  },
  forgotPassword: async (email: string) => unwrap(await apiClient.post<ApiResponse<{ message: string }>>("/auth/forgot-password", { email }, { noAuth: true })),
  resetPassword: async (email: string, code: string, new_password: string) => unwrap(await apiClient.post<ApiResponse<{ message: string }>>("/auth/reset-password", { email, code, new_password }, { noAuth: true })),
  sessions: async () => unwrap(await apiClient.get<ApiResponse<{ sessions: DeviceSession[] }>>("/auth/sessions")),
  revokeSession: async (id: string) => unwrap(await apiClient.delete<ApiResponse<Record<string, never>>>(`/auth/sessions/${id}`)),
  logoutAll: async () => {
    await apiClient.post("/auth/logout-all");
    useAuthStore.getState().clearAuth();
  },
};

let bootstrapPromise: Promise<void> | null = null;
export function restoreWebSession() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const token = useAuthStore.getState().accessToken ?? await refreshAccessToken();
    if (!token) { useAuthStore.getState().clearAuth(); return; }
    const user = await authApi.me();
    useAuthStore.getState().setAuth(user, useAuthStore.getState().accessToken ?? token);
  })().finally(() => { bootstrapPromise = null; });
  return bootstrapPromise;
}
