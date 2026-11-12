const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(fetch) {
  let refreshToken = "refresh-old";
  const state = {
    accessToken: "access-old", user: { id: "lawyer-one" }, chamberId: "chamber-one", generation: 0, scopeGeneration: 0,
    setAccessToken(token) { state.accessToken = token; },
    clearAuth() { state.accessToken = null; state.user = null; state.generation++; },
  };
  const store = { getState: () => state, subscribe: () => () => {} };
  const storage = {
    getRefreshToken: async () => refreshToken,
    saveSessionTokens: async (token) => { refreshToken = token; },
    clearSessionTokens: async () => { refreshToken = null; },
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/lib/api/client.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, process: { env: { EXPO_PUBLIC_API_URL: "http://test/api/v1" } },
    Headers, AbortController, setTimeout, clearTimeout, fetch,
    require: (name) => {
      if (name.includes("secureTokens")) return storage;
      if (name.includes("auth.store")) return { useAuthStore: store };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { ...exports, state, refresh: () => refreshToken };
}

function response(status, data = {}) {
  return new Response(JSON.stringify(status < 400 ? { success: true, data } : { success: false, error: { code: "TEST_ERROR", message: "Test failure" } }), { status, headers: { "Content-Type": "application/json" } });
}

test("parallel protected requests share one refresh and use rotated credentials", async () => {
  let rotations = 0;
  const client = harness(async (url, init) => {
    if (url.endsWith("/auth/refresh")) {
      rotations++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(200, { access_token: "access-new", refresh_token: "refresh-new", session_id: "session" });
    }
    return init.headers.get("Authorization") === "Bearer access-new" ? response(200, { ok: true }) : response(401);
  });
  const results = await Promise.all([client.apiClient.get("/cases"), client.apiClient.get("/users/me")]);
  assert.equal(rotations, 1);
  assert.equal(results.length, 2);
  assert.equal(client.refresh(), "refresh-new");
  assert.equal(client.state.accessToken, "access-new");
});

test("wrong login password never refreshes an unrelated session", async () => {
  const calls = [];
  const client = harness(async (url, init) => { calls.push({ url, init }); return response(401); });
  await assert.rejects(client.apiClient.post("/auth/login", { email: "a@example.com", password: "wrong" }, { noAuth: true }), { status: 401 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].init.headers.has("Authorization"), false);
  assert.equal(calls[0].init.credentials, "omit");
  assert.equal(client.refresh(), "refresh-old");
});

test("a transient refresh outage preserves the stored session", async () => {
  const client = harness(async (url) => {
    if (url.endsWith("/auth/refresh")) throw new Error("offline");
    return response(401);
  });
  await assert.rejects(client.apiClient.get("/cases"), { status: 0 });
  assert.equal(client.refresh(), "refresh-old");
  assert.equal(client.state.user.id, "lawyer-one");
});

test("revoked refresh credentials clear local authentication", async () => {
  const client = harness(async () => response(401));
  await assert.rejects(client.apiClient.get("/cases"), { status: 401 });
  assert.equal(client.refresh(), null);
  assert.equal(client.state.user, null);
});

test("case permission denial does not sign out the user", async () => {
  let calls = 0;
  const client = harness(async () => { calls++; return response(403); });
  await assert.rejects(client.apiClient.get("/cases/private"), { status: 403 });
  assert.equal(calls, 1);
  assert.equal(client.refresh(), "refresh-old");
});

test("response from a previous account is discarded even during JSON parsing", async () => {
  let finish;
  const body = new Promise((resolve) => { finish = resolve; });
  const client = harness(async () => ({ status: 200, ok: true, json: () => body }));
  const request = client.apiClient.get("/cases");
  await new Promise((resolve) => setTimeout(resolve, 0));
  client.state.clearAuth();
  finish({ success: true, data: { private: "old account" } });
  await assert.rejects(request, { status: 401 });
});

test("malformed server response gives a usable error", async () => {
  const client = harness(async () => new Response("Bad gateway", { status: 502 }));
  await assert.rejects(client.apiClient.get("/cases"), { status: 502 });
});
