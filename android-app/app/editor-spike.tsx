import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import type { WebViewNavigation } from "react-native-webview/lib/WebViewTypes";

import { colors } from "@/components/auth/AuthUI";
import { useNativeDictation } from "@/lib/editor/useNativeDictation";
import {
  getEditorSpikeUrl,
  isAllowedEditorNavigation,
  parseEditorBridgeMessage,
  serializeNativeEditorMessage,
  type NativeEditorMessage,
} from "@/lib/editor/bridge";

type EditorStatus = "loading" | "ready" | "saving" | "saved" | "error";
export default function EditorSpikeScreen() {
  const webViewRef = useRef<WebView>(null);
  const editorUrl = useMemo(() => getEditorSpikeUrl(), []);
  const editorOriginPattern = useMemo(() => `${new URL(editorUrl).origin}/*`, [editorUrl]);
  const [reloadKey, setReloadKey] = useState(0);
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMeta, setSavedMeta] = useState<{ characterCount: number; savedAt: string } | null>(null);
  const postToEditor = useCallback((message: NativeEditorMessage) => {
    webViewRef.current?.postMessage(serializeNativeEditorMessage(message));
  }, []);
  const { controller: dictation, phase: dictationPhase } = useNativeDictation(postToEditor);

  const closeEditor = useCallback(() => {
    const leave = () => { dictation.dispose(); router.back(); };
    if (!dirty) {
      leave();
      return;
    }
    Alert.alert(
      "Leave editor?",
      "Recent changes have not finished saving in this editor session.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: leave },
      ],
    );
  }, [dictation, dirty]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      closeEditor();
      return true;
    });
    return () => subscription.remove();
  }, [closeEditor]);

  function reloadEditor() {
    const reload = () => {
      dictation.dispose();
      setError(null);
      setStatus("loading");
      setDirty(false);
      setReloadKey((value) => value + 1);
    };
    if (!dirty) {
      reload();
      return;
    }
    Alert.alert(
      "Reload editor?",
      "Recent changes have not finished saving in this editor session.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reload", style: "destructive", onPress: reload },
      ],
    );
  }

  function handleMessage(event: WebViewMessageEvent) {
    const message = parseEditorBridgeMessage(event.nativeEvent.data);
    if (!message) return;
    if (message.type === "ready") {
      setStatus("ready");
      setError(null);
    } else if (message.type === "dirty") {
      setDirty(message.dirty);
      setStatus(message.dirty ? "saving" : "saved");
    } else if (message.type === "saved") {
      setDirty(false);
      setStatus("saved");
      setSavedMeta({ characterCount: message.characterCount, savedAt: message.savedAt });
    } else if (message.type === "error") {
      setStatus("error");
      setError(message.message || "The editor could not save this session.");
    } else if (message.type === "dictation.start") {
      dictation.start(message);
    } else if (message.type === "dictation.stop") {
      dictation.stop(message.requestId);
    } else if (message.type === "dictation.cancel") {
      dictation.cancel(message.requestId);
    }
  }

  function allowNavigation(request: WebViewNavigation): boolean {
    return isAllowedEditorNavigation(request.url);
  }

  const statusText = dictationPhase === "requesting"
    ? "Starting microphone…"
    : dictationPhase === "recording"
      ? "Dictation recording…"
      : dictationPhase === "transcribing"
        ? "Transcribing dictation…"
        : status === "loading"
    ? "Loading editor…"
    : status === "saving"
      ? "Saving session…"
      : status === "saved"
        ? "Saved in this session"
        : status === "error"
          ? "Editor needs attention"
          : "Editor ready";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close editor"
          onPress={closeEditor}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Feather name="x" size={23} color={colors.ink} />
        </Pressable>
        <View style={styles.heading}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>Lexical editor test</Text>
          <Text accessibilityLiveRegion="polite" numberOfLines={1} style={styles.status}>{statusText}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reload editor"
          onPress={reloadEditor}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Feather name="refresh-cw" size={20} color={colors.green} />
        </Pressable>
      </View>

      <View style={styles.notice}>
        <Feather name="shield" size={16} color="#8A5A00" />
        <Text style={styles.noticeText}>POC only · use non-sensitive test text · no account token is sent to the WebView.</Text>
      </View>

      <View style={styles.webViewFrame}>
        <WebView
          key={reloadKey}
          ref={webViewRef}
          source={{ uri: editorUrl }}
          originWhitelist={[editorOriginPattern]}
          onShouldStartLoadWithRequest={allowNavigation}
          onMessage={handleMessage}
          onLoadStart={() => { dictation.dispose(); setStatus("loading"); setError(null); }}
          onError={() => { dictation.dispose(); setStatus("error"); setError("Cannot reach the web editor. Start the frontend and reverse port 3000."); }}
          onHttpError={({ nativeEvent }) => {
            setStatus("error");
            setError(`Editor server returned HTTP ${nativeEvent.statusCode}.`);
          }}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures={false}
          mixedContentMode="never"
          textZoom={100}
          style={styles.webView}
        />
        {status === "loading" && (
          <View pointerEvents="none" style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.green} />
            <Text style={styles.loadingText}>Opening editor…</Text>
          </View>
        )}
        {error && (
          <View accessibilityRole="alert" style={styles.errorPanel}>
            <Feather name="alert-circle" size={20} color={colors.red} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={reloadEditor} style={styles.retryButton}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        )}
      </View>

      {savedMeta && (
        <Text style={styles.footer}>
          Last save: {savedMeta.characterCount.toLocaleString()} characters · {new Date(savedMeta.savedAt).toLocaleTimeString()}
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#FAFCFB" },
  header: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: "white" },
  heading: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  status: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconButton: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  pressed: { backgroundColor: colors.pale },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#FFF8E7", borderBottomWidth: 1, borderBottomColor: "#F2D28B" },
  noticeText: { flex: 1, color: "#6B4700", fontSize: 12, lineHeight: 18 },
  webViewFrame: { flex: 1, position: "relative", backgroundColor: "#EEF2F6" },
  webView: { flex: 1, backgroundColor: "#EEF2F6" },
  loadingOverlay: { position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.9)" },
  loadingText: { color: colors.muted, fontSize: 14 },
  errorPanel: { position: "absolute", left: 16, right: 16, top: 18, gap: 10, alignItems: "center", padding: 18, borderRadius: 8, borderWidth: 1, borderColor: "#F4C7CD", backgroundColor: "#FFF1F2" },
  errorText: { color: colors.red, fontSize: 14, lineHeight: 20, textAlign: "center" },
  retryButton: { minHeight: 44, minWidth: 120, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: colors.green, paddingHorizontal: 16 },
  retryText: { color: "white", fontWeight: "700" },
  footer: { color: colors.muted, backgroundColor: "white", borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 16, paddingVertical: 8, fontSize: 12 },
});
