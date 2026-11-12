const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function harness(options = {}) {
  let saved = { id: "scan-one", ownerId: "owner", chamberId: "chamber", caseId: "case", uri: "file://scan.pdf", fileName: "scan.pdf", fileSize: 123, status: "queued", transferComplete: false, documentId: null, attempts: 0, nextAttempt: 0, ...options.scan };
  const state = { user: { id: "owner" }, chamberId: "chamber", generation: 1, scopeGeneration: 1 };
  const listeners = new Set();
  const calls = { put: 0, presign: 0, confirm: 0, cleanup: 0, cancel: 0 };
  const locks = new Set();
  const assertScope = (owner, chamber) => { if (state.user?.id !== owner || state.chamberId !== chamber) throw new Error("Account or working chamber changed"); };
  const imports = {
    "react-native": { AppState: { currentState: "active" } },
    "zustand": { create: (factory) => { let s = factory(); return { getState: () => s, setState: (update) => { s = { ...s, ...(typeof update === "function" ? update(s) : update) }; } }; } },
    "@/store/auth.store": { useAuthStore: { getState: () => state, subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); } } },
    "@/lib/queryClient": { queryClient: { invalidateQueries: async () => {} } },
    "@/lib/api/client": {
      ApiError: class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } },
      apiClient: { get: async () => { if (options.permissionError) throw Object.assign(new Error("Permission denied"), { status: 403 }); return { can_edit: true }; } },
    },
    "@/lib/api/documents": {
      presignDocument: async (_case, body) => { calls.presign++; assert.equal(body.client_upload_id, saved.id); return { document_id: "doc", upload_url: "https://r2.example/file", already_uploaded: options.alreadyUploaded }; },
      confirmUpload: async (id) => { calls.confirm++; assert.equal(id, "doc"); if (options.confirmFailure) throw new Error("Confirm offline"); },
    },
    "expo-file-system/legacy": {
      FileSystemUploadType: { BINARY_CONTENT: 0 }, FileSystemSessionType: { FOREGROUND: 1 },
      getInfoAsync: async () => ({ exists: !options.missing, size: 123 }),
      createUploadTask: (_url, _uri, _config, progress) => ({
        cancelAsync: async () => { calls.cancel++; },
        uploadAsync: async () => { calls.put++; progress({ totalBytesSent: 123, totalBytesExpectedToSend: 123 }); if (options.accountSwitch) { state.user = null; state.generation++; for (const fn of listeners) fn(state); } return { status: options.transferFailure ? 500 : 200 }; },
      }),
    },
    "./library": {
      assertScope, getScan: async (owner, chamber) => { assertScope(owner, chamber); return structuredClone(saved); },
      listScans: async () => [structuredClone(saved)],
      saveScan: async (scan) => { assertScope(scan.ownerId, scan.chamberId); saved = structuredClone(scan); },
      cleanupPreference: async () => options.cleanup ?? false,
      removeLocalFiles: async () => { calls.cleanup++; },
      withScanLock: async (id, fn) => { if (locks.has(id)) throw new Error("busy"); locks.add(id); try { return await fn(); } finally { locks.delete(id); } },
    },
  };
  const source = fs.readFileSync(path.join(__dirname, "../src/lib/scans/upload.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, setTimeout, clearTimeout, require: (name) => { if (!(name in imports)) throw new Error(name); return imports[name]; } });
  return { ...exports, calls, state, scan: () => saved, options };
}

test("upload persists document and transfer checkpoints before confirmation", async () => {
  const h = harness({ cleanup: true });
  await h.uploadScan("owner", "chamber", "scan-one");
  assert.equal(h.scan().status, "uploaded");
  assert.equal(h.scan().documentId, "doc");
  assert.equal(h.scan().transferComplete, true);
  assert.equal(h.calls.put, 1);
  assert.equal(h.calls.cleanup, 1);
  assert.equal(h.useUploadProgress.getState().progress["scan-one"], 100);
});

test("lost confirmation retries only confirmation, not a new transfer", async () => {
  const h = harness({ confirmFailure: true, cleanup: true });
  await assert.rejects(h.uploadScan("owner", "chamber", "scan-one"), /Confirm offline/);
  assert.equal(h.scan().status, "failed");
  assert.equal(h.scan().transferComplete, true);
  assert.equal(h.calls.cleanup, 0);
  h.options.confirmFailure = false;
  await h.uploadScan("owner", "chamber", "scan-one");
  assert.equal(h.calls.presign, 1);
  assert.equal(h.calls.put, 1);
  assert.equal(h.calls.confirm, 2);
  assert.equal(h.scan().status, "uploaded");
});

test("failed transfer keeps PDF and retries using stable client upload ID", async () => {
  const h = harness({ transferFailure: true });
  await assert.rejects(h.uploadScan("owner", "chamber", "scan-one"), /Transfer interrupted/);
  assert.equal(h.scan().transferComplete, false);
  assert.ok(h.scan().nextAttempt > Date.now());
  h.options.transferFailure = false;
  await h.uploadScan("owner", "chamber", "scan-one");
  assert.equal(h.calls.presign, 2);
  assert.equal(h.calls.confirm, 1);
});

test("server-completed uploads skip PUT after lost response", async () => {
  const h = harness({ alreadyUploaded: true });
  await h.uploadScan("owner", "chamber", "scan-one");
  assert.equal(h.calls.put, 0);
  assert.equal(h.calls.confirm, 1);
  assert.equal(h.scan().status, "uploaded");
});

test("revoked case access blocks upload and disables automatic retry", async () => {
  const h = harness({ permissionError: true });
  await assert.rejects(h.uploadScan("owner", "chamber", "scan-one"), /Permission denied/);
  assert.equal(h.scan().nextAttempt, 0);
  assert.equal(h.calls.presign, 0);
  assert.equal(h.calls.put, 0);
});

test("account switch cancels transfer and never confirms as another user", async () => {
  const h = harness({ accountSwitch: true });
  await assert.rejects(h.uploadScan("owner", "chamber", "scan-one"), /Account or working chamber changed/);
  assert.equal(h.calls.cancel, 1);
  assert.equal(h.calls.confirm, 0);
});

test("interrupted uploading status resumes after app restart", async () => {
  const h = harness({ scan: { status: "uploading", transferComplete: true, documentId: "doc" } });
  await h.recoverQueue("owner", "chamber");
  assert.equal(h.scan().status, "uploaded");
  assert.equal(h.calls.put, 0);
});

test("drafts and paused uploads are not silently uploaded", async () => {
  for (const status of ["draft", "paused"]) {
    const h = harness({ scan: { status } });
    await h.processQueue("owner", "chamber");
    assert.equal(h.calls.presign, 0);
    assert.equal(h.scan().status, status);
  }
});

test("fifth failed attempt stops automatic retries", async () => {
  const h = harness({ transferFailure: true, scan: { attempts: 4 } });
  await assert.rejects(h.uploadScan("owner", "chamber", "scan-one"));
  assert.equal(h.scan().attempts, 5);
  assert.equal(h.scan().nextAttempt, 0);
});
