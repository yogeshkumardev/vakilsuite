import { focusManager, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Action, AuthPage, Notice } from "@/components/auth/AuthUI";
import { bootstrapSession, fetchMe } from "@/lib/api/auth";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/auth.store";
import { ScanQueue } from "@/components/ScanQueue";

function RootNavigator() {
  const { user, accessToken, isBootstrapping } = useAuthStore();
  const [startupError, setStartupError] = useState<string | null>(null);
  async function restore() {
    setStartupError(null);
    useAuthStore.getState().setBootstrapping(true);
    try { await bootstrapSession(); } catch (error) { setStartupError(error instanceof Error ? error.message : "Unable to restore your session."); }
  }
  useEffect(() => {
    let active = true;
    void bootstrapSession().catch((error) => {
      if (active) setStartupError(error instanceof Error ? error.message : "Unable to restore your session.");
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const refreshUser = () => {
      if (AppState.currentState === "active" && useAuthStore.getState().user) void fetchMe().catch(() => undefined);
    };
    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
      if (state === "active") refreshUser();
    });
    const timer = setInterval(refreshUser, 30000);
    return () => { subscription.remove(); clearInterval(timer); };
  }, []);

  if (isBootstrapping) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}><ActivityIndicator color="#126B5D" /></View>;
  if (startupError) return <AuthPage title="Let's reconnect"><Notice>{startupError}</Notice><Action onPress={() => void restore()}>Try again</Action></AuthPage>;

  const signedIn = Boolean(accessToken && user);
  return <Stack screenOptions={{ headerTintColor: "#182626", headerShadowVisible: false, contentStyle: { backgroundColor: "white" } }}>
    <Stack.Protected guard={!signedIn}><Stack.Screen name="(auth)" options={{ headerShown: false }} /></Stack.Protected>
    <Stack.Protected guard={signedIn}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="account/profile" options={{ title: "Profile" }} />
      <Stack.Screen name="account/security" options={{ title: "Security" }} />
      <Stack.Screen name="account/sessions" options={{ title: "Signed-in devices" }} />
      <Stack.Screen name="editor-spike" options={{ headerShown: false }} />
      <Stack.Screen name="review-inbox" options={{ title: "Review inbox" }} />
      <Stack.Screen name="cases/[caseId]/working-document-editor" options={{ headerShown: false }} />
      <Stack.Screen name="clients" options={{ title: "Clients" }} />
      <Stack.Screen name="matters/new" options={{ title: "New Matter" }} />
      <Stack.Screen name="cases/[caseId]" options={{ title: "Case" }} />
      <Stack.Screen name="cases/[caseId]/scan" options={{ title: "Scan" }} />
      <Stack.Screen name="cases/[caseId]/import-pdf" options={{ title: "Upload PDF" }} />
      <Stack.Screen name="cases/[caseId]/review-scan" options={{ title: "Review scan" }} />
      <Stack.Screen name="cases/[caseId]/upload" options={{ title: "Upload" }} />
      <Stack.Screen name="cases/[caseId]/clients" options={{ title: "Matter clients" }} />
      <Stack.Screen name="cases/[caseId]/fees" options={{ title: "Fee ledger" }} />
      <Stack.Screen name="cases/[caseId]/summary" options={{ title: "Prepare case summary" }} />
      <Stack.Screen name="cases/[caseId]/summary-review" options={{ title: "Review summary" }} />
      <Stack.Screen name="cases/[caseId]/okf-export" options={{ title: "Prepare OKF export" }} />
      <Stack.Screen name="cases/[caseId]/legal-research" options={{ title: "Legal research" }} />
    </Stack.Protected>
    <Stack.Protected guard={signedIn && user?.role !== "munshi"}><Stack.Screen name="cases/new" options={{ title: "New case" }} /></Stack.Protected>
  </Stack>;
}

export default function RootLayout() {
  return <SafeAreaProvider><QueryClientProvider client={queryClient}><ScanQueue /><RootNavigator /></QueryClientProvider></SafeAreaProvider>;
}
