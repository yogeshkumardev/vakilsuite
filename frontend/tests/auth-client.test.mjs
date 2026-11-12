import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness(fetch) {
  const state = {
    accessToken: "old-access", user: { id: "test-user" }, generation: 0,
    clearAuth() { state.accessToken = null; state.user = null; state.generation++; },
  };
  const store = { getState: () => state, setState: (data) => Object.assign(state, data) };
  const chamberState = { selected: { id: "chamber-one", name: "Test chamber", role: "owner" } };
  const chamberStore = { getState: () => ({ ...chamberState, clear() {} }) };
  const source = fs.readFileSync(new URL("../src/lib/api/client.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, process: { env: {} }, AbortController, setTimeout, clearTimeout, fetch,
    require: (name) => {
      if (name.includes("auth.store")) return { useAuthStore: store };
      if (name.includes("chamber.store")) return { useChamberStore: chamberStore };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { ...exports, state, chamberState };
}

function response(status, data = {}) {
  return new Response(JSON.stringify({ success: status < 400, data }), { status });
}

test("web logout waits for refresh before clearing the session", async () => {
  let finish;
  const gate = new Promise((resolve) => { finish = resolve; });
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const order = [];
  const client = harness(async () => { started(); await gate; order.push("rotated"); return response(200, { access_token: "new-access" }); });
  const refresh = client.refreshAccessToken();
  await ready;
  const logout = client.withSessionLock(async () => { order.push("logout"); client.state.clearAuth(); });
  assert.deepEqual(order, []);
  finish();
  await Promise.all([refresh, logout]);
  assert.deepEqual(order, ["rotated", "logout"]);
  assert.equal(client.state.accessToken, null);
});

test("parallel web 401s perform one refresh", async () => {
  let refreshes = 0;
  const client = harness(async (url, init) => {
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return response(200, { access_token: "new-access" });
    }
    return response(init.headers.Authorization === "Bearer new-access" ? 200 : 401);
  });
  await Promise.all([client.apiClient.get("/cases"), client.apiClient.get("/users/me")]);
  assert.equal(refreshes, 1);
});

test("working-chamber change cancels an in-flight protected request", async () => {
  let started;
  const ready = new Promise((resolve) => { started = resolve; });
  const client = harness((_url, init) => new Promise((_resolve, reject) => {
    started();
    init.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  const request = client.apiClient.get("/cases");
  await ready;
  client.cancelScopedRequests();
  await assert.rejects(request, { code: "SCOPE_CHANGED", status: 409 });
});

test("temporary server failure during refresh does not sign out the browser", async () => {
  const client = harness(async (url) => response(url.endsWith("/auth/refresh") ? 503 : 401));
  await assert.rejects(client.apiClient.get("/cases"), { status: 503 });
  assert.equal(client.state.user.id, "test-user");
  assert.equal(client.state.accessToken, "old-access");
});

test("binary export keeps UTF-8 filename and file bytes", async () => {
  const client = harness(async () => new Response(new Uint8Array([0x50, 0x4b]), {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "content-disposition": "attachment; filename=export.docx; filename*=UTF-8''%E0%A4%85%E0%A4%B0%E0%A5%8D%E0%A4%9C%E0%A5%80.docx",
    },
  }));

  const file = await client.apiClient.postFile("/exports/render", { output_format: "docx" });
  assert.equal(file.fileName, "अर्जी.docx");
  assert.deepEqual([...new Uint8Array(await file.blob.arrayBuffer())], [0x50, 0x4b]);
});

test("binary export parses the standard API error envelope", async () => {
  const client = harness(async () => new Response(JSON.stringify({
    error: { code: "EXPORT_UNAVAILABLE", message: "PDF export is unavailable", details: {} },
  }), { status: 503, headers: { "content-type": "application/json" } }));

  await assert.rejects(
    client.apiClient.postFile("/exports/render", {}),
    { code: "EXPORT_UNAVAILABLE", status: 503 },
  );
});

test("operation-specific timeout remains bounded and does not retry paid submissions", async () => {
  let calls = 0;
  const client = harness(async (_url, init) => {
    calls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted")), {once:true}));
  });
  await assert.rejects(client.apiClient.post('/documents/test/summary-source/ocr', {}, {timeoutMs:5}), error => error.code === 'NETWORK_ERROR');
  assert.equal(calls, 1);
});
