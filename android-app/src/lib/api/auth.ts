import { apiClient, ApiError, clearLocalSession, refreshAccessToken, waitForRefresh } from "@/lib/api/client";
import { getOrCreateDeviceId, getRefreshToken, saveSessionTokens } from "@/lib/storage/secureTokens";
import { useAuthStore } from "@/store/auth.store";
import { AuthTokens, DeviceSession, User } from "@/types/api";

async function authenticate(path: string, fields: Record<string, string>) {
  await waitForRefresh();
  const data = await apiClient.post<AuthTokens>(path, {
    ...fields, ...(fields.email ? { email: fields.email.trim().toLowerCase() } : {}), device_type: "android",
    device_name: "Android phone", device_id: await getOrCreateDeviceId(),
  }, { noAuth: true });
  await saveSessionTokens(data.refresh_token, data.session_id);
  useAuthStore.getState().setAuth(data.user, data.access_token);
  return data;
}

export const login = (email: string, password: string) => authenticate("/auth/login", { email, password });
export const loginWithGoogle = (id_token: string) => authenticate("/auth/login/google", { id_token });
export const register = (full_name: string, email: string, password: string) => authenticate("/auth/register", { full_name: full_name.trim(), email, password });

export async function fetchMe() {
  const generation = useAuthStore.getState().generation;
  const user = await apiClient.get<User>("/users/me").catch(async (error) => {
    if (error instanceof ApiError && error.status === 403 && generation === useAuthStore.getState().generation) await clearLocalSession();
    throw error;
  });
  if (generation === useAuthStore.getState().generation) useAuthStore.getState().setUser(user);
  return user;
}

let bootstrapPromise: Promise<User | null> | null = null;
export function bootstrapSession() {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    try {
      const token = await refreshAccessToken();
      return token ? await fetchMe() : null;
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        await clearLocalSession();
        return null;
      }
      throw error;
    } finally {
      useAuthStore.getState().setBootstrapping(false);
      bootstrapPromise = null;
    }
  })();
  return bootstrapPromise;
}

export async function logout(allDevices = false) {
  await waitForRefresh();
  const refreshToken = await getRefreshToken();
  if (allDevices) await apiClient.post("/auth/logout-all");
  else await apiClient.post("/auth/logout", { refresh_token: refreshToken }, { noAuth: true });
  await clearLocalSession();
}

export async function changePassword(current_password: string, new_password: string) {
  await apiClient.post("/auth/change-password", { current_password, new_password });
  await clearLocalSession();
}

export async function updateProfile(data: { full_name: string; mobile_number?: string; enrollment_number?: string }) {
  const user = await apiClient.patch<User>("/users/me/profile", data);
  useAuthStore.getState().setUser(user);
  return user;
}

export const forgotPassword = (email: string) => apiClient.post<{ message: string }>("/auth/forgot-password", { email: email.trim() }, { noAuth: true });
export const resetPassword = (email: string, code: string, new_password: string) => apiClient.post("/auth/reset-password", { email: email.trim(), code, new_password }, { noAuth: true });
export const listSessions = () => apiClient.get<{ sessions: DeviceSession[] }>("/auth/sessions");
export const revokeSession = (id: string) => apiClient.delete(`/auth/sessions/${id}`);
