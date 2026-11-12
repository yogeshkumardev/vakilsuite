const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const vm = require("node:vm");
const { randomUUID } = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");
const { PDFDocument } = require("pdf-lib");
const ts = require("typescript");

function load(name, imports) {
  const source = fs.readFileSync(path.join(__dirname, `../src/lib/scans/${name}.ts`), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (key) => { if (!(key in imports)) throw new Error(`Unexpected import ${key}`); return imports[key]; } });
  return exports;
}

function harness(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "scan-test-"));
  const database = new DatabaseSync(path.join(root, "scans.db"));
  const state = { user: { id: "owner-a" }, chamberId: "chamber-a" };
  const files = {
    documentDirectory: `${root}/`, EncodingType: { Base64: "base64" },
    makeDirectoryAsync: async (dir) => fs.mkdirSync(dir, { recursive: true }),
    copyAsync: async ({ from, to }) => fs.copyFileSync(from, to),
    deleteAsync: async (uri) => fs.rmSync(uri, { force: true, recursive: true }),
    getInfoAsync: async (uri) => fs.existsSync(uri) ? { exists: true, size: fs.statSync(uri).size } : { exists: false },
    readAsStringAsync: async (uri, options = {}) => {
      const bytes = fs.readFileSync(uri);
      return (options.length === undefined ? bytes : bytes.subarray(options.position ?? 0, (options.position ?? 0) + options.length)).toString("base64");
    },
    writeAsStringAsync: async (uri, content) => fs.writeFileSync(uri, Buffer.from(content, "base64")),
  };
  const imports = {
    "expo-sqlite": { openDatabaseAsync: async () => ({
      execAsync: async (sql) => database.exec(sql),
      runAsync: async (sql, ...params) => database.prepare(sql).run(...params),
      getFirstAsync: async (sql, ...params) => database.prepare(sql).get(...params),
      getAllAsync: async (sql, ...params) => database.prepare(sql).all(...params),
    }) },
    "expo-file-system/legacy": files,
    "expo-crypto": { randomUUID },
    "@/store/auth.store": { useAuthStore: { getState: () => state } },
  };
  const library = load("library", imports);
  t.after(() => { database.close(); fs.rmSync(root, { recursive: true, force: true }); });
  const record = (id = randomUUID()) => ({
    id, ownerId: "owner-a", chamberId: "chamber-a", caseId: "case-a", fileName: "scan.pdf", uri: "local.pdf", pages: [],
    pageCount: 2, fileSize: 100, quality: "original", status: "draft", documentId: null,
    transferComplete: false, attempts: 0, nextAttempt: 0, error: null, createdAt: Date.now(), localDeleted: false,
  });
  return { root, database, state, files, imports, library, record };
}

test("owner-only legacy scan rows are quarantined instead of assigned to the active chamber", async (t) => {
  const h = harness(t);
  h.database.exec("CREATE TABLE scans (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL)");
  h.database.prepare("INSERT INTO scans(id, owner, data) VALUES (?, ?, ?)").run("legacy-scan", "owner-a", JSON.stringify({ id: "legacy-scan", ownerId: "owner-a" }));

  assert.equal((await h.library.listScans("owner-a", "chamber-a")).length, 0);
  const migrated = h.database.prepare("SELECT chamber FROM scans WHERE id = ?").get("legacy-scan");
  assert.equal(migrated.chamber, "legacy-unassigned");
});

test("SQLite drafts survive module restart and stay isolated by account and chamber", async (t) => {
  const h = harness(t);
  const scan = h.record();
  await h.library.saveScan(scan);
  const restarted = load("library", h.imports);
  assert.equal((await restarted.getScan("owner-a", "chamber-a", scan.id)).fileName, "scan.pdf");
  h.state.chamberId = "chamber-b";
  assert.equal((await restarted.listScans("owner-a", "chamber-b")).length, 0);
  await assert.rejects(restarted.getScan("owner-a", "chamber-b", scan.id), /not found/);
  h.state.user = { id: "owner-b" };
  assert.equal((await restarted.listScans("owner-b", "chamber-b")).length, 0);
  await assert.rejects(restarted.getScan("owner-b", "chamber-b", scan.id), /not found/);
  await assert.rejects(restarted.listScans("owner-a", "chamber-a"), /Account or working chamber changed/);
});

test("digital PDF import keeps original bytes and persists a retryable account-scoped draft", async t => {
  const h = harness(t);
  const file = path.join(h.root, "digital.pdf");
  fs.writeFileSync(file, "%PDF-1.7\nSynthetic original bytes");
  const scan = await h.library.persistImportedPdf("owner-a", "chamber-a", "case-a", file, "digital.pdf");
  assert.equal(scan.status, "draft");
  assert.equal(scan.fileName, "digital.pdf");
  assert.equal(scan.pages.length, 0);
  assert.equal(fs.readFileSync(scan.uri, "utf8"), fs.readFileSync(file, "utf8"));
  assert.equal((await h.library.getScan("owner-a", "chamber-a", scan.id)).caseId, "case-a");
});

test("digital PDF import rejects renamed non-PDF and oversized/empty files before persistence", async t => {
  const h = harness(t);
  const file = path.join(h.root, "fake.pdf");
  fs.writeFileSync(file, "not a PDF");
  await assert.rejects(h.library.persistImportedPdf("owner-a", "chamber-a", "case-a", file, "fake.pdf"), /not a PDF/);
  h.files.getInfoAsync = async () => ({ exists: true, size: 51 * 1024 * 1024 });
  await assert.rejects(h.library.persistImportedPdf("owner-a", "chamber-a", "case-a", file, "large.pdf"), /50 MB/);
  h.files.getInfoAsync = async () => ({ exists: true, size: 0 });
  await assert.rejects(h.library.persistImportedPdf("owner-a", "chamber-a", "case-a", file, "empty.pdf"), /non-empty/);
  assert.equal((await h.library.listScans("owner-a", "chamber-a")).length, 0);
});

test("successful scan is copied out of cache and cancellation creates no record", async (t) => {
  const h = harness(t);
  await assert.rejects(h.library.persistScan("owner-a", "chamber-a", "case", { didCancel: true }), /no PDF/);
  assert.equal((await h.library.listScans("owner-a", "chamber-a")).length, 0);
  const pdf = path.join(h.root, "cached.pdf"), jpg = path.join(h.root, "cached.jpg");
  fs.writeFileSync(pdf, "pdf bytes"); fs.writeFileSync(jpg, "image bytes");
  const scan = await h.library.persistScan("owner-a", "chamber-a", "case", { pdf: { uri: pdf, pageCount: 1 }, images: [{ uri: jpg, width: 100, height: 200 }] });
  fs.unlinkSync(pdf); fs.unlinkSync(jpg);
  assert.equal(fs.existsSync(scan.uri), true);
  assert.equal(fs.existsSync(scan.pages[0].uri), true);
  assert.equal(scan.fileSize, 9);
});

test("failed page copy leaves no partial draft or directory", async (t) => {
  const h = harness(t);
  const pdf = path.join(h.root, "cached.pdf"); fs.writeFileSync(pdf, "bytes");
  await assert.rejects(h.library.persistScan("owner-a", "chamber-a", "case", { pdf: { uri: pdf, pageCount: 1 }, images: [{ uri: "missing.jpg", width: 100, height: 200 }] }));
  assert.equal((await h.library.listScans("owner-a", "chamber-a")).length, 0);
  assert.equal(fs.readdirSync(path.join(h.root, "scans/owner-a/chamber-a")).length, 0);
});

test("cleanup never deletes pending PDF; preferences persist by account", async (t) => {
  const h = harness(t);
  await h.library.setCleanupPreference("owner-a", "chamber-a", true);
  assert.equal(await h.library.cleanupPreference("owner-a", "chamber-a"), true);
  await assert.rejects(h.library.removeLocalFiles(h.record()), /Only uploaded/);
  h.state.user = { id: "owner-b" };
  h.state.chamberId = "chamber-b";
  assert.equal(await h.library.cleanupPreference("owner-b", "chamber-b"), false);
});

test("scan lock prevents simultaneous edit, upload and deletion", async (t) => {
  const h = harness(t);
  let unlock;
  const pending = h.library.withScanLock("one", () => new Promise((resolve) => { unlock = resolve; }));
  await assert.rejects(h.library.withScanLock("one", async () => {}), /busy/);
  unlock(); await pending;
  await h.library.withScanLock("one", async () => {});
});

test("original PDF reorder preserves page dimensions and original source", async (t) => {
  const h = harness(t);
  const original = await PDFDocument.create();
  original.addPage([595, 842]); original.addPage([612, 792]);
  const scan = h.record();
  const dir = h.library.scanDirectory(scan.ownerId, scan.chamberId, scan.id);
  fs.mkdirSync(dir, { recursive: true });
  scan.uri = `${dir}original.pdf`;
  fs.writeFileSync(scan.uri, await original.save());
  scan.pages = [0, 1].map((originalIndex) => ({ uri: `${dir}${originalIndex}.jpg`, originalIndex, width: 100, height: 200 }));
  await h.library.saveScan(scan);
  const editor = load("pdf", { ...h.imports, "./library": h.library, "pdf-lib": { PDFDocument }, "expo-image-manipulator": {} });
  await editor.editScan(scan.ownerId, scan.chamberId, scan.id, [...scan.pages].reverse(), "original", "Reordered");
  const updated = await h.library.getScan(scan.ownerId, scan.chamberId, scan.id);
  const pdf = await PDFDocument.load(fs.readFileSync(updated.uri));
  assert.equal(pdf.getPage(0).getWidth(), 612);
  assert.equal(pdf.getPage(1).getWidth(), 595);
  assert.equal(updated.fileName, "Reordered.pdf");
  assert.equal(fs.existsSync(scan.uri), true);
});

test("PDF editing rejects active uploads and duplicate pages", async (t) => {
  const h = harness(t);
  const scan = h.record(); scan.status = "queued";
  await h.library.saveScan(scan);
  const editor = load("pdf", { ...h.imports, "./library": h.library, "pdf-lib": { PDFDocument }, "expo-image-manipulator": {} });
  await assert.rejects(editor.editScan(scan.ownerId, scan.chamberId, scan.id, [], "original", "Test"), /already started/);
  scan.status = "draft"; scan.pages = [{ uri: "one", originalIndex: 0 }]; await h.library.saveScan(scan);
  await assert.rejects(editor.editScan(scan.ownerId, scan.chamberId, scan.id, [scan.pages[0], scan.pages[0]], "original", "Test"), /Invalid pages/);
});
