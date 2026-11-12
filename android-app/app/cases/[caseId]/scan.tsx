import { launchScanner } from "@dariyd/react-native-document-scanner";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Text } from "react-native";

import { Button, Muted, Screen, Title } from "@/components/ui/Screen";
import { persistScan } from "@/lib/scans/library";
import { queryClient } from "@/lib/queryClient";
import { CaseEditGuard } from "@/components/auth/CaseEditGuard";
import { useAuthStore } from "@/store/auth.store";
import { enqueueScan } from "@/lib/scans/upload";

function Scanner() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const started = useRef(false);
  const busy = useRef(false);

  const startScan = async () => {
    if (busy.current) return;
    const generation = useAuthStore.getState().generation;
    const scopeGeneration = useAuthStore.getState().scopeGeneration;
    const owner = useAuthStore.getState().user?.id;
    const chamber = useAuthStore.getState().chamberId;
    if (!owner || !chamber) return;
    busy.current = true;
    setError(null);
    setIsScanning(true);
    try {
      const result = await launchScanner({
        quality: 0.9,
        includeBase64: false,
        maxWidth: 2500,
        maxHeight: 2500,
        pageLimit: 20,
        galleryImportAllowed: true,
        scannerMode: "full",
        includePdf: true,
      });

      if (result.didCancel) { router.back(); return; }
      if (result.error) {
        setError(result.errorMessage ?? "Scanner failed. Please try again.");
        return;
      }
      if (!result.pdf) {
        setError("Scanner did not return a PDF. Please try again.");
        return;
      }

      if (generation !== useAuthStore.getState().generation || scopeGeneration !== useAuthStore.getState().scopeGeneration) return;

      const scan = await persistScan(owner, chamber, caseId, result);
      if (generation !== useAuthStore.getState().generation || scopeGeneration !== useAuthStore.getState().scopeGeneration) return;
      await queryClient.invalidateQueries({ queryKey: ["local-scans", owner, chamber] });
      await enqueueScan(owner, chamber, scan.id);
      router.replace({ pathname: "/cases/[caseId]/upload", params: { caseId, scanId: scan.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scanner failed. Please try again.");
    } finally {
      setIsScanning(false);
      busy.current = false;
    }
  };

  useEffect(() => {
    if (!started.current) { started.current = true; void startScan(); }
    // Launch once after the permission guard mounts this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen>
      <Title>Scan Documents</Title>
      <Muted>Finish in Google scanner to save the PDF and upload it automatically.</Muted>
      {error && <Text style={{ color: "#dc2626" }}>{error}</Text>}
      <Button loading={isScanning} onPress={startScan}>
        Scan
      </Button>
    </Screen>
  );
}

export default function ScanScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  return <CaseEditGuard caseId={caseId}><Scanner /></CaseEditGuard>;
}
