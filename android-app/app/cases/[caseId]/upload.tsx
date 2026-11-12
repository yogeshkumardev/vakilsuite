import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DocumentViewer, type ViewerFile } from "@/components/DocumentViewer";
import { saveLocally } from "@/lib/documents/localFiles";
import { Button, Muted, Screen, Title } from "@/components/ui/Screen";
import { getScan } from "@/lib/scans/library";
import { enqueueScan, useUploadProgress } from "@/lib/scans/upload";
import { useAuthStore } from "@/store/auth.store";

export default function UploadScreen() {
  const { caseId, scanId } = useLocalSearchParams<{ caseId: string; scanId: string }>();
  const owner = useAuthStore((state) => state.user?.id);
  const chamber = useAuthStore((state) => state.chamberId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [viewing, setViewing] = useState<ViewerFile | null>(null);
  const closeViewer = useCallback(() => setViewing(null), []);
  const percentage = useUploadProgress((state) => state.progress[scanId] ?? 0);
  const query = useQuery({ queryKey: ["local-scans", owner, chamber, scanId], queryFn: () => getScan(owner!, chamber!, scanId), enabled: Boolean(owner && chamber && scanId), refetchInterval: 1000 });
  const scan = query.data;
  const active = scan?.status === "uploading" || scan?.status === "queued";
  const quarantined = scan?.status === "quarantined";
  async function queue() {
    if (!owner || !chamber || !scan || scan.caseId !== caseId) return;
    setBusy(true); setError(null);
    try { await enqueueScan(owner, chamber, scanId); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to queue scan."); }
    finally { setBusy(false); }
  }
  return <Screen>
    <Title>{scan?.status === "uploaded" ? "PDF saved" : "Save PDF"}</Title>
    {query.isLoading && <Muted>Loading scan...</Muted>}
    {query.error && <Text style={{ color: "#b42318" }}>{query.error.message}</Text>}
    {scan && scan.caseId === caseId && <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${scan.fileName}`} disabled={scan.localDeleted && scan.status !== "uploaded"} onPress={() => setViewing({ name: scan.fileName, mime: "application/pdf", ...(!scan.localDeleted ? { uri: scan.uri } : { documentId: scan.documentId ?? undefined }) })}><Text style={{ fontSize: 18, fontWeight: "600", color: "#126B5D", textDecorationLine: "underline", paddingVertical: 10 }}>{scan.fileName}</Text></Pressable>
      <Muted>{(scan.fileSize / 1024 / 1024).toFixed(2)} MB · {scan.captureSource === "android_scan" ? "Scanned" : "Imported PDF"} · {scan.status}</Muted>
      {active && <View style={{ gap: 8 }}>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: percentage }} style={{ height: 8, borderRadius: 4, backgroundColor: "#e2e8f0", overflow: "hidden" }}><View style={{ height: 8, width: `${percentage}%`, backgroundColor: "#126B5D" }} /></View>
        <Muted>{percentage >= 97 ? "Confirming upload..." : `${percentage}%`}</Muted>
      </View>}
      {(error || scan.error) && <Text accessibilityRole="alert" style={{ color: "#b42318" }}>{error || scan.error}</Text>}
      {!active && !quarantined && scan.status !== "uploaded" && <Button loading={busy} onPress={() => void queue()}>{scan.status === "failed" ? "Retry Upload" : "Upload PDF"}</Button>}
      {scan.status === "uploaded" && <Muted>Uploaded successfully.</Muted>}
      {quarantined && <>
        <Text accessibilityRole="alert" style={{ color: "#b42318", fontWeight: "700" }}>This file needs a clean replacement.</Text>
        <Muted>The server rejected it because its content could not be verified. The original local PDF is still safe on this phone.</Muted>
        <Button disabled={busy} onPress={() => router.replace(`/cases/${caseId}/scan`)}>Scan a replacement</Button>
        <Button variant="secondary" disabled={busy} onPress={() => router.replace(`/cases/${caseId}/import-pdf`)}>Import a replacement PDF</Button>
      </>}
      {notice && <Muted>{notice}</Muted>}
      <Button variant="secondary" disabled={busy || active} onPress={() => {
        if (scan.localDeleted) { setViewing({ name: scan.fileName, mime: "application/pdf", documentId: scan.documentId ?? undefined }); return; }
        setBusy(true); setError(null);
        void saveLocally(scan.uri, scan.fileName).then(setNotice).catch(e => setError(e instanceof Error ? e.message : "Could not save locally.")).finally(() => setBusy(false));
      }}>Save locally</Button>
      <Button variant="secondary" disabled={busy} onPress={() => router.replace(`/cases/${caseId}/scan`)}>+ Keep scanning</Button>
    </>}
    <Button variant="secondary" onPress={() => router.replace(`/cases/${caseId}`)}>Back</Button>
    {viewing && <DocumentViewer file={viewing} onClose={closeViewer} />}
  </Screen>;
}
