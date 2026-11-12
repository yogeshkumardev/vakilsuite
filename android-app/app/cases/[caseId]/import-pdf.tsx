import { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Button, Muted, Screen, Title } from "@/components/ui/Screen";
import { CaseEditGuard } from "@/components/auth/CaseEditGuard";
import { persistImportedPdf } from "@/lib/scans/library";
import { enqueueScan } from "@/lib/scans/upload";
import { useAuthStore } from "@/store/auth.store";

function ImportPdf({ caseId }: { caseId: string }) {
  const started = useRef(false);
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pick() {
    if (lock.current) return;
    const { user, generation, scopeGeneration, chamberId } = useAuthStore.getState();
    if (!user || !chamberId) return;
    lock.current = true; setBusy(true); setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "application/pdf", multiple: false, copyToCacheDirectory: true });
      if (result.canceled) { router.back(); return; }
      if (generation !== useAuthStore.getState().generation || scopeGeneration !== useAuthStore.getState().scopeGeneration) return;
      const file = result.assets[0];
      const scan = await persistImportedPdf(user.id, chamberId, caseId, file.uri, file.name);
      if (generation !== useAuthStore.getState().generation || scopeGeneration !== useAuthStore.getState().scopeGeneration) return;
      await enqueueScan(user.id, chamberId, scan.id);
      router.replace({ pathname: "/cases/[caseId]/upload", params: { caseId, scanId: scan.id } });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not import PDF."); }
    finally { lock.current = false; setBusy(false); }
  }
  useEffect(() => {
    if (!started.current) { started.current = true; void pick(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Screen><Title>Upload PDF</Title><Muted>Choose a digital PDF up to 50 MB. Upload starts automatically.</Muted>{error && <Muted>{error}</Muted>}<Button loading={busy} onPress={() => void pick()}>Choose PDF</Button></Screen>;
}

export default function ImportPdfScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  return <CaseEditGuard caseId={caseId}><ImportPdf caseId={caseId} /></CaseEditGuard>;
}
