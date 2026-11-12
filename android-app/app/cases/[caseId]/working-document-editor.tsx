import Feather from "@expo/vector-icons/Feather";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";
import { colors } from "@/components/auth/AuthUI";
import { createEditorBootstrap } from "@/lib/api/workingDocuments";
import { useNativeDictation } from "@/lib/editor/useNativeDictation";
import { getEditorSessionUrl, isAllowedEditorNavigation, parseEditorBridgeMessage, serializeNativeEditorMessage, type NativeEditorMessage } from "@/lib/editor/bridge";

type EditorStatus = "loading" | "ready" | "saving" | "saved" | "error";

/** A restricted WebView. It receives only a five-minute, editor-only capability. */
export default function WorkingDocumentEditorScreen() {
  const { documentId, title } = useLocalSearchParams<{ documentId: string; title?: string }>();
  const webViewRef = useRef<WebView>(null);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const postToEditor = useCallback((message: NativeEditorMessage) => webViewRef.current?.postMessage(serializeNativeEditorMessage(message)), []);
  const { controller: dictation, phase: dictationPhase } = useNativeDictation(postToEditor);
  const editorOriginPattern = useMemo(() => editorUrl ? `${new URL(editorUrl).origin}/*` : "http://127.0.0.1/*", [editorUrl]);

  const start = useCallback(async () => {
    if (!documentId) { setError("No working document was selected."); return; }
    setStatus("loading"); setError(null); setEditorUrl(null);
    try {
      const bootstrap = await createEditorBootstrap(documentId);
      // Kept only in this component's memory and a URL fragment (never request headers/logs).
      setEditorUrl(getEditorSessionUrl(bootstrap.session_id, bootstrap.token));
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Could not open the secure editor.");
    }
  }, [documentId]);

  useEffect(() => {
    // Schedule stateful bootstrap after effect registration so React does not
    // synchronously cascade a render while subscribing the native editor.
    void Promise.resolve().then(start);
    return () => dictation.dispose();
  }, [dictation, start]);
  const close = useCallback(() => {
    const leave = () => { dictation.dispose(); router.back(); };
    if (!dirty) return leave();
    Alert.alert("Leave editor?", "Recent changes may still be saving.", [{ text: "Keep editing", style: "cancel" }, { text: "Leave", style: "destructive", onPress: leave }]);
  }, [dictation, dirty]);
  useEffect(() => { const subscription = BackHandler.addEventListener("hardwareBackPress", () => { close(); return true; }); return () => subscription.remove(); }, [close]);

  const handleMessage = (event: WebViewMessageEvent) => {
    const message = parseEditorBridgeMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === "ready") { setStatus("ready"); setError(null); }
    if (message.type === "dirty") { setDirty(message.dirty); setStatus(message.dirty ? "saving" : "saved"); }
    if (message.type === "saved") { setDirty(false); setStatus("saved"); }
    if (message.type === "error") { setStatus("error"); setError(message.message); }
    if (message.type === "dictation.start") dictation.start(message);
    if (message.type === "dictation.stop") dictation.stop(message.requestId);
    if (message.type === "dictation.cancel") dictation.cancel(message.requestId);
  };
  const statusText = dictationPhase === "recording" ? "Dictation recording…" : dictationPhase === "transcribing" ? "Transcribing…" : status === "loading" ? "Opening secure editor…" : status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Editor needs attention" : "Editor ready";

  return <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Close editor" onPress={close} style={styles.icon}><Feather name="x" size={22} color={colors.ink} /></Pressable><View style={styles.heading}><Text numberOfLines={1} style={styles.title}>{title ?? "Legal draft"}</Text><Text accessibilityLiveRegion="polite" style={styles.status}>{statusText}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Reload editor" onPress={() => void start()} style={styles.icon}><Feather name="refresh-cw" size={19} color={colors.green} /></Pressable></View>
    <View style={styles.frame}>{editorUrl && <WebView ref={webViewRef} source={{ uri: editorUrl }} originWhitelist={[editorOriginPattern]} onShouldStartLoadWithRequest={(request: WebViewNavigation) => isAllowedEditorNavigation(request.url)} onMessage={handleMessage} onLoadStart={() => { dictation.dispose(); setStatus("loading"); }} onError={() => { setStatus("error"); setError("Cannot reach the web editor. Start the frontend and reverse port 3000."); }} javaScriptEnabled domStorageEnabled sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false} setSupportMultipleWindows={false} mixedContentMode="never" style={styles.webView} />}{status === "loading" && <View pointerEvents="none" style={styles.loading}><ActivityIndicator color={colors.green} /><Text style={styles.loadingText}>Opening editor…</Text></View>}{error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void start()} style={styles.retry}><Text style={styles.retryText}>Try again</Text></Pressable></View>}</View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: "#FAFCFB" }, header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "white" }, heading: { flex: 1, minWidth: 0 }, title: { color: colors.ink, fontSize: 17, fontWeight: "700" }, status: { color: colors.muted, fontSize: 12, marginTop: 2 }, icon: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 8 }, frame: { flex: 1, position: "relative", backgroundColor: "#EEF2F6" }, webView: { flex: 1, backgroundColor: "#EEF2F6" }, loading: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.9)" }, loadingText: { color: colors.muted, fontSize: 14 }, error: { position: "absolute", left: 16, right: 16, top: 18, alignItems: "center", gap: 10, padding: 18, borderRadius: 8, borderWidth: 1, borderColor: "#F4C7CD", backgroundColor: "#FFF1F2" }, errorText: { color: colors.red, fontSize: 14, textAlign: "center" }, retry: { minHeight: 44, justifyContent: "center", borderRadius: 8, backgroundColor: colors.green, paddingHorizontal: 16 }, retryText: { color: "white", fontWeight: "700" } });
