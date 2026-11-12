import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { Button, Card, Muted, Screen, Title } from "@/components/ui/Screen";
import { cleanupPreference, deleteScan, listScans, setCleanupPreference } from "@/lib/scans/library";
import { enqueueScan, pauseScan } from "@/lib/scans/upload";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";

export default function LibraryScreen() {
  const owner = useAuthStore((state) => state.user?.id);
  const chamber = useAuthStore((state) => state.chamberId);
  const [filter, setFilter] = useState<"all" | "pending" | "uploaded">("all");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const scans = useQuery({ queryKey: ["local-scans", owner, chamber], queryFn: () => listScans(owner!, chamber!), enabled: Boolean(owner && chamber), refetchInterval: 2000 });
  const cleanup = useQuery({ queryKey: ["scan-cleanup", owner, chamber], queryFn: () => cleanupPreference(owner!, chamber!), enabled: Boolean(owner && chamber) });
  async function action(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); await queryClient.invalidateQueries({ queryKey: ["local-scans", owner, chamber] }); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update library."); }
    finally { setBusy(false); }
  }
  const items = (scans.data ?? []).filter((scan) => filter === "all" || (filter === "uploaded" ? scan.status === "uploaded" : scan.status !== "uploaded"));
  return <Screen refreshing={scans.isRefetching} onRefresh={() => void scans.refetch()}>
    <Title>Library</Title>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={{ flex: 1, color: "#334155" }}>Remove local files after upload</Text>
      <Switch accessibilityLabel="Remove local files after successful upload" value={cleanup.data ?? false} disabled={busy || cleanup.isPending || Boolean(cleanup.error) || !chamber} onValueChange={(value) => void action(async () => { await setCleanupPreference(owner!, chamber!, value); await cleanup.refetch(); })} trackColor={{ true: "#126B5D" }} />
    </View>
    <View accessibilityRole="tablist" style={{ flexDirection: "row", borderBottomWidth: 1, borderColor: "#dbe4e0" }}>
      {(["all", "pending", "uploaded"] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }} onPress={() => setFilter(value)} style={{ flex: 1, paddingVertical: 14, borderBottomWidth: 2, borderColor: filter === value ? "#126B5D" : "transparent" }}><Text style={{ textAlign: "center", color: filter === value ? "#126B5D" : "#64748b", textTransform: "capitalize" }}>{value}</Text></Pressable>)}
    </View>
    {(error || scans.error || cleanup.error) && <Text accessibilityRole="alert" style={{ color: "#b42318" }}>{error || scans.error?.message || cleanup.error?.message}</Text>}
    {scans.isPending && <Muted>Loading scans...</Muted>}
    {!scans.isPending && !items.length && <Muted>No {filter === "all" ? "saved" : filter} scans.</Muted>}
    {items.map((scan) => <Card key={scan.id}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Feather name={scan.status === "uploaded" ? "check-circle" : "file-text"} color={scan.status === "failed" ? "#b42318" : "#126B5D"} size={22} />
        <Pressable style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Review ${scan.fileName}`} onPress={() => router.push({ pathname: "/cases/[caseId]/review-scan", params: { caseId: scan.caseId, scanId: scan.id } })}><Text style={{ color: "#182626", fontWeight: "600", fontSize: 16 }}>{scan.fileName}</Text></Pressable>
        <Pressable disabled={busy || scan.status === "uploading" || scan.status === "queued"} accessibilityRole="button" accessibilityLabel={`Delete local scan ${scan.fileName}`} onPress={() => Alert.alert("Delete local scan?", scan.status === "uploaded" ? "The uploaded document will remain in the case." : "This PDF has not finished uploading. Its local copy will be permanently removed.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void action(() => deleteScan(owner!, chamber!, scan.id)) }])} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: scan.status === "uploading" || scan.status === "queued" ? 0.3 : 1 }}><Feather name="trash-2" size={20} color="#b42318" /></Pressable>
      </View>
      <Muted>{scan.pageCount ? `${scan.pageCount} pages · ` : ""}{(scan.fileSize / 1024 / 1024).toFixed(2)} MB · {scan.captureSource === "android_scan" ? "Scanned" : "Imported"} · {scan.status}</Muted>
      {scan.error && <Text style={{ color: "#b42318" }}>{scan.error}</Text>}
      {["failed", "paused"].includes(scan.status) && <Button disabled={busy} onPress={() => void action(() => enqueueScan(owner!, chamber!, scan.id))}>{scan.status === "paused" ? "Resume Upload" : "Retry Upload"}</Button>}
      {scan.status === "quarantined" && <>
        <Text accessibilityRole="alert" style={{ color: "#b42318", fontWeight: "700" }}>Replacement required</Text>
        <Muted>The server rejected this original. It will not retry automatically.</Muted>
        <Button disabled={busy} onPress={() => router.push(`/cases/${scan.caseId}/${scan.captureSource === "android_scan" ? "scan" : "import-pdf"}`)}>Create replacement</Button>
      </>}
      {["queued", "failed"].includes(scan.status) && <Button variant="secondary" disabled={busy} onPress={() => void action(() => pauseScan(owner!, chamber!, scan.id))}>Pause Upload</Button>}
      <Button variant="secondary" onPress={() => router.push(scan.status === "uploaded" ? `/cases/${scan.caseId}` : { pathname: "/cases/[caseId]/review-scan", params: { caseId: scan.caseId, scanId: scan.id } })}>{scan.status === "uploaded" ? "Open Case" : "Review PDF"}</Button>
    </Card>)}
  </Screen>;
}
