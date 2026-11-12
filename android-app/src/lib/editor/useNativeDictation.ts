import { getRecordingPermissionsAsync, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from "expo-audio";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { connectNativeDictation } from "@/lib/api/dictation-realtime";
import { useAuthStore } from "@/store/auth.store";
import type { NativeEditorMessage } from "./bridge";
import { NativeDictationController, type DictationPhase } from "./nativeDictation";
import { RecordingPermissionGate } from "./recordingPermission";

export function useNativeDictation(post: (message: NativeEditorMessage) => void) {
  const controllerRef = useRef<NativeDictationController | null>(null);
  const [phase, setPhase] = useState<DictationPhase>("idle");
  const { stream } = useAudioStream({
    sampleRate: 16000, channels: 1, encoding: "int16",
    onBuffer: (buffer) => controllerRef.current?.audio(buffer),
  });
  const { controller, permissionGate } = useMemo(() => {
    const permissionGate = new RecordingPermissionGate({
      check: getRecordingPermissionsAsync,
      request: requestRecordingPermissionsAsync,
      currentState: () => AppState.currentState,
    });
    const controller = new NativeDictationController({
      prepareAudio: async (isCurrent) => {
        await permissionGate.prepare(isCurrent);
        if (isCurrent()) await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      },
      startAudio: () => stream.start(),
      stopAudio: () => stream.stop(),
      resetAudio: () => setAudioModeAsync({ allowsRecording: false }),
      connect: connectNativeDictation,
      accountGeneration: () => useAuthStore.getState().generation,
      post,
      onPhase: setPhase,
    });
    return { controller, permissionGate };
  }, [post, stream]);

  useEffect(() => {
    controllerRef.current = controller;
    const appState = AppState.addEventListener("change", (next) => {
      if (permissionGate.onAppState(next)) controller.cancel(undefined, "Dictation stopped when the app went into the background. Tap Dictate to start again.");
    });
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (state.generation !== previous.generation) controller.cancel(undefined, "Account changed. Start dictation again.");
    });
    return () => {
      controllerRef.current = null;
      appState.remove();
      unsubscribe();
      controller.dispose();
      permissionGate.cancelWait();
    };
  }, [controller, permissionGate]);
  return { controller, phase };
}
