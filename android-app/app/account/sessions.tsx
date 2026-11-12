import Feather from "@expo/vector-icons/Feather";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Text, View } from "react-native";
import { Action, Caption, colors, Notice } from "@/components/auth/AuthUI";
import { Screen, Title } from "@/components/ui/Screen";
import { listSessions, logout, revokeSession } from "@/lib/api/auth";
import { clearLocalSession } from "@/lib/api/client";
import { getSessionId } from "@/lib/storage/secureTokens";

export default function SessionsScreen() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: listSessions, refetchInterval: 15000 });
  const current = useQuery({ queryKey: ["current-session"], queryFn: getSessionId });
  const revoke = useMutation({ mutationFn: revokeSession, onSuccess: async (_, id) => { if (id === current.data) await clearLocalSession(); else await qc.invalidateQueries({ queryKey: ["sessions"] }); } });
  const all = useMutation({ mutationFn: () => logout(true) });
  return <Screen refreshing={sessions.isRefetching} onRefresh={() => void sessions.refetch()}><Title>Signed-in devices</Title>
    <Notice>{sessions.error?.message || revoke.error?.message || all.error?.message}</Notice>
    {sessions.isLoading && <Caption>Loading devices...</Caption>}
    {sessions.data?.sessions.map((session) => <View key={session.id} style={{ paddingVertical: 18, gap: 12, borderBottomWidth: 1, borderColor: colors.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}><Feather name={session.device_type === "web" ? "monitor" : "smartphone"} size={24} color={colors.green} /><View style={{ flex: 1, gap: 5 }}><Text style={{ fontSize: 16, fontWeight: "600", color: colors.ink }}>{session.device_name || (session.device_type === "web" ? "Web browser" : "Mobile device")}</Text><Caption>{session.id === current.data ? "This device" : session.device_type} · {new Date(`${session.last_seen_at}Z`).toLocaleString()}</Caption></View></View>
      <Action secondary loading={revoke.isPending && revoke.variables === session.id} disabled={all.isPending || revoke.isPending} onPress={() => Alert.alert("Sign out this device?", "This device will need to sign in again.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => revoke.mutate(session.id) }])}>Sign out device</Action>
    </View>)}
    <Action loading={all.isPending} disabled={revoke.isPending} onPress={() => Alert.alert("Sign out everywhere?", "All web and mobile sessions, including this phone, will end.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out all", style: "destructive", onPress: () => all.mutate() }])}>Sign out all devices</Action>
  </Screen>;
}
