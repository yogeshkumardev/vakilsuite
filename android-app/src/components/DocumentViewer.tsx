import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Modal, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Pdf from "react-native-pdf";
import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { randomUUID } from "expo-crypto";
import { Button } from "@/components/ui/Screen";
import { getSummarySource } from "@/lib/api/summaries";
import { getDocumentViewUrl } from "@/lib/api/documents";
import { saveLocally } from "@/lib/documents/localFiles";
import { useAuthStore } from "@/store/auth.store";

export type ViewerFile = { name: string; mime: string; documentId?: string; uri?: string; pageNumber?:number; summarySource?:{caseId:string;runId:string;findingId:string;citationIndex:number} };

export function DocumentViewer({ file, onClose }: { file: ViewerFile; onClose: () => void }) {
  const [mime,setMime]=useState(file.mime);
  const [initialPage,setInitialPage]=useState(file.pageNumber ?? 1);
  const [filename,setFilename]=useState(file.name);
  const [uri, setUri] = useState<string | undefined>(file.uri);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    let temporary: string | undefined;
    const generation = useAuthStore.getState().generation;
    const valid = () => active && generation === useAuthStore.getState().generation;
    const unsubscribe = useAuthStore.subscribe(state => { if (state.generation !== generation) onClose(); });
    void (async () => {
      try {
        if (file.uri) return;
        if ((!file.documentId && !file.summarySource) || !FS.cacheDirectory) throw new Error("File unavailable.");
        let url:string;
        if (file.summarySource) {
          const result=await getSummarySource(file.summarySource.caseId,file.summarySource.runId,file.summarySource.findingId,file.summarySource.citationIndex);
          url=result.url;
          if(valid()){setInitialPage(result.page_number);setFilename(result.filename);setMime(result.mime_type);}
        } else { url=(await getDocumentViewUrl(file.documentId!)).url; }
        if (!valid()) return;
        if (!url.startsWith("https://")) throw new Error("Invalid document URL.");
        temporary = `${FS.cacheDirectory}document-${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150)}`;
        const result = await FS.downloadAsync(url, temporary);
        if (!valid()) { await FS.deleteAsync(temporary, { idempotent: true }); return; }
        if (result.status !== 200) throw new Error("Unable to download document. Retry to refresh the link.");
        setUri(result.uri);
      } catch (error) { if (valid()) { setFailed(true); setMessage(error instanceof Error ? error.message : "Could not open file."); } }
    })();
    return () => { active = false; unsubscribe(); if (temporary) void FS.deleteAsync(temporary, { idempotent: true }).catch(() => undefined); };
  }, [file, attempt, onClose]);

  async function action(kind: "save" | "share") {
    if (!uri || busy) return;
    setBusy(true); setMessage("");
    try { if (kind === "save") setMessage(await saveLocally(uri, filename, mime)); else await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: filename }); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not save/share file."); }
    finally { setBusy(false); }
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{ flex: 1, backgroundColor: "white", padding: 12, gap: 10 }}>
    <Text style={{ fontSize: 16, fontWeight: "600" }}>{filename}</Text>
    {file.summarySource && <Text>Requested original page {initialPage}. If it does not open automatically, navigate to this page.</Text>}
    {message ? <Text accessibilityLiveRegion="polite">{message}</Text> : null}
    {!uri && !failed && <ActivityIndicator />}
    {failed && <Button onPress={() => { setMessage(""); setFailed(false); setUri(undefined); setAttempt(v => v + 1); }}>Retry</Button>}
    {uri && mime === "application/pdf" && <Pdf page={initialPage} source={{ uri }} trustAllCerts={false} style={{ flex: 1 }} onError={() => { setMessage("This PDF could not be rendered. It may be password-protected or damaged."); }} />}
    {uri && mime.startsWith("image/") && <Image source={{ uri }} resizeMode="contain" style={{ flex: 1 }} />}
    {uri && mime !== "application/pdf" && !mime.startsWith("image/") && <Text>In-app preview is available for PDF and images. Save or share this file to read it.</Text>}
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      <Button variant="secondary" disabled={!uri || busy} onPress={() => void action("save")}>Save locally</Button>
      <Button variant="secondary" disabled={!uri || busy} onPress={() => void action("share")}>Share</Button>
      <Button variant="secondary" onPress={onClose}>Back</Button>
    </View>
  </SafeAreaView></Modal>;
}
