import { useEffect } from "react";
import { AppState } from "react-native";
import { useAuthStore } from "@/store/auth.store";
import { processQueue, recoverQueue, useUploadProgress } from "@/lib/scans/upload";

export function ScanQueue() {
  const owner = useAuthStore((state) => state.user?.id);
  const chamber = useAuthStore((state) => state.chamberId);
  useEffect(() => {
    useUploadProgress.setState({ progress: {} });
    if (!owner || !chamber) return;
    void recoverQueue(owner, chamber).catch(() => undefined);
    const timer = setInterval(() => void processQueue(owner, chamber), 15000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void processQueue(owner, chamber);
    });
    return () => { clearInterval(timer); subscription.remove(); };
  }, [owner, chamber]);
  return null;
}
