import * as FS from "expo-file-system/legacy";
import { create } from "zustand";
import { AppState } from "react-native";
import { apiClient, ApiError } from "@/lib/api/client";
import { presignDocument, confirmUpload } from "@/lib/api/documents";
import { useAuthStore } from "@/store/auth.store";
import { queryClient } from "@/lib/queryClient";
import { assertScope, cleanupPreference, getScan, listScans, removeLocalFiles, saveScan, withScanLock } from "./library";
import type { SavedScan } from "./types";

export const useUploadProgress = create<{ progress: Record<string, number> }>(() => ({ progress: {} }));
function progress(id: string, value: number) {
  useUploadProgress.setState((state) => ({ progress: { ...state.progress, [id]: value } }));
}

function classifyUploadFailure(error: unknown) {
  const message = error instanceof Error ? error.message : "Upload failed.";
  const normalized = message.toLowerCase();
  const quarantined = error instanceof ApiError && error.status === 422 && (
    normalized.includes("encrypted") || normalized.includes("corrupt") || normalized.includes("unsupported") || normalized.includes("does not match") || normalized.includes("not a valid docx")
  );
  return { message, quarantined };
}

async function transfer(scan: SavedScan, url: string, generation: number, scopeGeneration: number) {
  const task = FS.createUploadTask(url, scan.uri, {
    httpMethod: "PUT", uploadType: FS.FileSystemUploadType.BINARY_CONTENT,
    headers: { "Content-Type": "application/pdf" }, sessionType: FS.FileSystemSessionType.FOREGROUND,
  }, (event) => {
    const current = useAuthStore.getState();
    if (current.generation === generation && current.scopeGeneration === scopeGeneration && event.totalBytesExpectedToSend > 0) {
      progress(scan.id, Math.min(95, Math.round(event.totalBytesSent / event.totalBytesExpectedToSend * 95)));
    }
  });
  const cancel = () => { void task.cancelAsync().catch(() => undefined); };
  const unsubscribe = useAuthStore.subscribe((state) => { if (state.generation !== generation || state.scopeGeneration !== scopeGeneration) cancel(); });
  const timer = setTimeout(cancel, 180000);
  try {
    const result = await task.uploadAsync();
    if (!result || result.status < 200 || result.status >= 300) throw new Error("Transfer interrupted. Your PDF is saved; retry when connected.");
  } finally { clearTimeout(timer); unsubscribe(); }
}

export async function uploadScan(owner: string, chamber: string, id: string) {
  return withScanLock(id, async () => {
    let scan = await getScan(owner, chamber, id);
    if (!["queued", "failed", "uploading"].includes(scan.status)) return;
    const { generation, scopeGeneration } = useAuthStore.getState();
    const check = () => {
      assertScope(owner, chamber);
      const current = useAuthStore.getState();
      if (generation !== current.generation || scopeGeneration !== current.scopeGeneration) throw new Error("Account or working chamber changed. Retry from your library.");
    };
    try {
      scan = { ...scan, status: "uploading", error: null, attempts: scan.attempts + 1, lastAttemptAt: Date.now() };
      await saveScan(scan);
      if (scan.localDeleted || scan.fileSize > 50 * 1024 * 1024) throw new Error("PDF is missing or exceeds the 50 MB upload limit.");
      check();
      const permissions = await apiClient.get<{ can_edit: boolean }>(`/cases/${scan.caseId}/permissions`);
      check();
      if (!permissions.can_edit) throw Object.assign(new Error("You no longer have edit access to this case."), { status: 403 });
      progress(id, 0);
      if (!scan.transferComplete) {
        const info = await FS.getInfoAsync(scan.uri);
        if (!info.exists || info.size !== scan.fileSize) throw new Error("Saved PDF is missing or changed. Scan again.");
        check();
        const presign = await presignDocument(scan.caseId, {
          filename: scan.fileName, mime_type: "application/pdf", document_type: "other",
          file_size_bytes: scan.fileSize, client_upload_id: scan.id, origin: scan.captureSource,
        });
        check();
        scan = { ...scan, documentId: presign.document_id };
        await saveScan(scan);
        if (!presign.already_uploaded) await transfer(scan, presign.upload_url, generation, scopeGeneration);
        check();
        scan = { ...scan, transferComplete: true };
        await saveScan(scan);
      }
      check();
      if (!scan.documentId) throw new Error("Upload checkpoint is missing.");
      progress(id, 97);
      await confirmUpload(scan.documentId);
      check();
      scan = { ...scan, status: "uploaded", error: null, nextAttempt: 0 };
      await saveScan(scan);
      progress(id, 100);
      try { if (await cleanupPreference(owner, chamber)) await removeLocalFiles(scan); } catch { /* Retain a confirmed PDF when local cleanup fails. */ }
      await queryClient.invalidateQueries({ queryKey: ["documents", scan.caseId] });
    } catch (error) {
      const current = useAuthStore.getState();
      if (current.user?.id === owner && current.chamberId === chamber) {
        const status = (error as { status?: number }).status;
        const failure = classifyUploadFailure(error);
        const blocked = status === 401 || status === 403 || status === 404 || scan.attempts >= 5;
        await saveScan({ ...scan, status: failure.quarantined ? "quarantined" : "failed", error: failure.message, nextAttempt: blocked || failure.quarantined ? 0 : Date.now() + Math.min(300000, 15000 * 2 ** scan.attempts) });
      }
      throw error;
    } finally { await queryClient.invalidateQueries({ queryKey: ["local-scans", owner, chamber] }); }
  });
}

export async function enqueueScan(owner: string, chamber: string, id: string) {
  await withScanLock(id, async () => {
    const scan = await getScan(owner, chamber, id);
    if (scan.status === "uploaded") return;
    if (scan.status === "quarantined") throw new Error("This file was rejected by verification. Scan or import a clean original instead.");
    await saveScan({ ...scan, status: "queued", error: null, nextAttempt: 0, attempts: 0 });
  });
  progress(id, 0);
  await queryClient.invalidateQueries({ queryKey: ["local-scans", owner, chamber] });
  void processQueue(owner, chamber);
}

export async function pauseScan(owner: string, chamber: string, id: string) {
  await withScanLock(id, async () => {
    const scan = await getScan(owner, chamber, id);
    if (scan.status === "uploaded") return;
    await saveScan({ ...scan, status: "paused", nextAttempt: 0 });
  });
  await queryClient.invalidateQueries({ queryKey: ["local-scans", owner, chamber] });
}

let workerBusy = false;
export async function processQueue(owner: string, chamber: string) {
  if (workerBusy || AppState.currentState !== "active") return;
  workerBusy = true;
  try {
    const scans = await listScans(owner, chamber);
    for (const scan of scans.reverse()) {
      assertScope(owner, chamber);
      if (AppState.currentState !== "active") break;
      if (scan.status === "queued" || scan.status === "uploading" || (scan.status === "failed" && scan.nextAttempt > 0 && scan.nextAttempt <= Date.now())) {
        await uploadScan(owner, chamber, scan.id).catch(() => undefined);
      }
    }
  } catch { /* A signed-out account must never continue its queue. */ }
  finally { workerBusy = false; }
}

export async function recoverQueue(owner: string, chamber: string) {
  for (const scan of await listScans(owner, chamber)) {
    if (scan.status === "uploading") await withScanLock(scan.id, () => saveScan({ ...scan, status: "queued", error: null } )).catch(() => undefined);
  }
  await processQueue(owner, chamber);
}
