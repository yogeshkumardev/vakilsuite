import * as SQLite from "expo-sqlite";
import * as FS from "expo-file-system/legacy";
import { randomUUID } from "expo-crypto";
import type { ScanResult } from "@dariyd/react-native-document-scanner";
import { useAuthStore } from "@/store/auth.store";
import type { SavedScan } from "./types";

let database: Promise<SQLite.SQLiteDatabase> | undefined;
const LEGACY_CHAMBER_SCOPE = "legacy-unassigned";
async function db() {
  if (!database) database = (async () => {
    const connection = await SQLite.openDatabaseAsync("scan-library.db");
    await connection.execAsync(`PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, owner TEXT NOT NULL, chamber TEXT NOT NULL DEFAULT '${LEGACY_CHAMBER_SCOPE}', data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS scan_settings_v2 (owner TEXT NOT NULL, chamber TEXT NOT NULL, cleanup INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(owner, chamber));`);
    const columns = await connection.getAllAsync<{ name: string }>("PRAGMA table_info(scans)");
    if (!columns.some((column) => column.name === "chamber")) {
      await connection.execAsync(`ALTER TABLE scans ADD COLUMN chamber TEXT NOT NULL DEFAULT '${LEGACY_CHAMBER_SCOPE}';`);
    }
    await connection.execAsync("CREATE INDEX IF NOT EXISTS scans_owner_chamber ON scans(owner, chamber);");
    return connection;
  })().catch((error) => { database = undefined; throw error; });
  return database;
}

export function assertScope(owner: string, chamber: string) {
  const current = useAuthStore.getState();
  if (current.user?.id !== owner || current.chamberId !== chamber) throw new Error("Account or working chamber changed. Please reopen your library.");
}

export function scanDirectory(owner: string, chamber: string, id: string) {
  if (!FS.documentDirectory) throw new Error("Device storage is unavailable.");
  return `${FS.documentDirectory}scans/${owner}/${chamber}/${id}/`;
}

export async function listScans(owner: string, chamber: string): Promise<SavedScan[]> {
  assertScope(owner, chamber);
  const rows = await (await db()).getAllAsync<{ data: string }>("SELECT data FROM scans WHERE owner = ? AND chamber = ?", owner, chamber);
  assertScope(owner, chamber);
  return rows.map((row) => normalizeScan(JSON.parse(row.data) as SavedScan)).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getScan(owner: string, chamber: string, id: string): Promise<SavedScan> {
  assertScope(owner, chamber);
  const row = await (await db()).getFirstAsync<{ data: string }>("SELECT data FROM scans WHERE owner = ? AND chamber = ? AND id = ?", owner, chamber, id);
  assertScope(owner, chamber);
  if (!row) throw new Error("Local scan not found.");
  return normalizeScan(JSON.parse(row.data) as SavedScan);
}

/** Keep older locally saved scans readable after the S04 workflow expansion. */
function normalizeScan(scan: SavedScan): SavedScan {
  return {
    ...scan,
    captureSource: scan.captureSource ?? (scan.pages.length ? "android_scan" : "android_import"),
    annexureId: scan.annexureId ?? null,
    lastAttemptAt: scan.lastAttemptAt ?? null,
  };
}

export async function saveScan(scan: SavedScan) {
  assertScope(scan.ownerId, scan.chamberId);
  const connection = await db();
  assertScope(scan.ownerId, scan.chamberId);
  await connection.runAsync("INSERT INTO scans(id, owner, chamber, data) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data WHERE scans.owner = excluded.owner AND scans.chamber = excluded.chamber", scan.id, scan.ownerId, scan.chamberId, JSON.stringify(scan));
}

const locks = new Set<string>();
export async function withScanLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  if (locks.has(id)) throw new Error("This scan is busy. Please wait.");
  locks.add(id);
  try { return await action(); } finally { locks.delete(id); }
}

export async function persistScan(owner: string, chamber: string, caseId: string, result: ScanResult): Promise<SavedScan> {
  assertScope(owner, chamber);
  if (!result.pdf || !result.images?.length) throw new Error("Scanner returned no PDF or pages. Please scan again.");
  if (result.pdf.pageCount !== result.images.length || result.images.some((page) => !Number.isFinite(page.width) || !Number.isFinite(page.height) || page.width <= 0 || page.height <= 0)) throw new Error("Scanner returned incomplete pages. Please scan again.");
  const id = randomUUID();
  const directory = scanDirectory(owner, chamber, id);
  try {
    await FS.makeDirectoryAsync(directory, { intermediates: true });
    const uri = `${directory}original.pdf`;
    await FS.copyAsync({ from: result.pdf.uri, to: uri });
    const pages = [];
    for (const [index, page] of result.images.entries()) {
      const pageUri = `${directory}page-${index}.jpg`;
      await FS.copyAsync({ from: page.uri, to: pageUri });
      pages.push({ uri: pageUri, width: page.width, height: page.height, originalIndex: index });
    }
    const info = await FS.getInfoAsync(uri);
    if (!info.exists || !info.size) throw new Error("Scanned PDF is empty.");
    const scan: SavedScan = {
      id, ownerId: owner, chamberId: chamber, caseId, uri, pages, fileName: `Scan-${new Date().toISOString().slice(0, 10)}.pdf`,
      pageCount: result.pdf.pageCount, fileSize: info.size, quality: "original", captureSource: "android_scan", annexureId: null, status: "draft",
      documentId: null, transferComplete: false, attempts: 0, nextAttempt: 0, error: null,
      lastAttemptAt: null, createdAt: Date.now(), localDeleted: false,
    };
    await saveScan(scan);
    return scan;
  } catch (error) {
    await FS.deleteAsync(directory, { idempotent: true }).catch(() => undefined);
    throw error;
  }
}

export async function persistImportedPdf(owner: string, chamber: string, caseId: string, source: string, name: string): Promise<SavedScan> {
  assertScope(owner, chamber);
  const info = await FS.getInfoAsync(source);
  if (!info.exists || !info.size || info.size > 50 * 1024 * 1024) throw new Error("Choose a non-empty PDF up to 50 MB.");
  const header = await FS.readAsStringAsync(source, { encoding: FS.EncodingType.Base64, position: 0, length: 5 });
  if (header !== "JVBERi0=") throw new Error("This file is not a PDF.");
  const id = randomUUID();
  const directory = scanDirectory(owner, chamber, id);
  try {
    await FS.makeDirectoryAsync(directory, { intermediates: true });
    const uri = `${directory}original.pdf`;
    await FS.copyAsync({ from: source, to: uri });
    const scan: SavedScan = { id, ownerId: owner, chamberId: chamber, caseId, uri, pages: [], fileName: name.replace(/[/\\]/g, "_").slice(0, 490), pageCount: 0, fileSize: info.size, quality: "original", captureSource: "android_import", annexureId: null, status: "draft", documentId: null, transferComplete: false, attempts: 0, nextAttempt: 0, error: null, lastAttemptAt: null, createdAt: Date.now(), localDeleted: false };
    await saveScan(scan);
    return scan;
  } catch (error) { await FS.deleteAsync(directory, { idempotent: true }).catch(() => undefined); throw error; }
}

export async function cleanupPreference(owner: string, chamber: string): Promise<boolean> {
  assertScope(owner, chamber);
  const row = await (await db()).getFirstAsync<{ cleanup: number }>("SELECT cleanup FROM scan_settings_v2 WHERE owner = ? AND chamber = ?", owner, chamber);
  return Boolean(row?.cleanup);
}

export async function setCleanupPreference(owner: string, chamber: string, value: boolean) {
  assertScope(owner, chamber);
  await (await db()).runAsync("INSERT INTO scan_settings_v2(owner, chamber, cleanup) VALUES (?, ?, ?) ON CONFLICT(owner, chamber) DO UPDATE SET cleanup = excluded.cleanup", owner, chamber, Number(value));
}

export async function removeLocalFiles(scan: SavedScan) {
  assertScope(scan.ownerId, scan.chamberId);
  if (scan.status !== "uploaded") throw new Error("Only uploaded scans can be cleaned up.");
  await FS.deleteAsync(scanDirectory(scan.ownerId, scan.chamberId, scan.id), { idempotent: true });
  await saveScan({ ...scan, localDeleted: true, pages: [], uri: "" });
}

export async function deleteScan(owner: string, chamber: string, id: string) {
  return withScanLock(id, async () => {
    const scan = await getScan(owner, chamber, id);
    await FS.deleteAsync(scanDirectory(owner, chamber, scan.id), { idempotent: true });
    assertScope(owner, chamber);
    await (await db()).runAsync("DELETE FROM scans WHERE owner = ? AND chamber = ? AND id = ?", owner, chamber, id);
  });
}
