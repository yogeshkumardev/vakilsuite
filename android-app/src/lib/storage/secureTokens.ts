import * as SecureStore from "expo-secure-store";

const REFRESH_TOKEN_KEY = "vakilsuite.refreshToken";
const SESSION_ID_KEY = "vakilsuite.sessionId";
const DEVICE_ID_KEY = "vakilsuite.deviceId";

function makeDeviceId() {
  return `android-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export async function saveSessionTokens(refreshToken: string, sessionId: string) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(SESSION_ID_KEY, sessionId);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function getSessionId() {
  return SecureStore.getItemAsync(SESSION_ID_KEY);
}

export async function clearSessionTokens() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(SESSION_ID_KEY);
}

export async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const deviceId = makeDeviceId();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
