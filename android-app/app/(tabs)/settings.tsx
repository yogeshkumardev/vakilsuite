import Feather from "@expo/vector-icons/Feather";
import { useMutation } from "@tanstack/react-query";
import { router, type Href } from "expo-router";
import { type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Action, colors, Notice } from "@/components/auth/AuthUI";
import { Screen, Title } from "@/components/ui/Screen";
import { logout } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";

export default function SettingsScreen() {
  const user = useAuthStore((state) => state.user);
  const mutation = useMutation({ mutationFn: () => logout() });
  const items: { label: string; icon: ComponentProps<typeof Feather>["name"]; href: Href }[] = [
    { label: "Personal details", icon: "user", href: "/account/profile" },
    { label: "Password & security", icon: "lock", href: "/account/security" },
    { label: "Signed-in devices", icon: "smartphone", href: "/account/sessions" },
    { label: "Chamber & members", icon: "briefcase", href: "/account/chambers" },
    { label: "Lexical editor test", icon: "edit-3", href: "/editor-spike" },
  ];
  return <Screen>
    <Title>Account</Title>
    <View style={s.identity}>
      <View style={s.avatar}><Text style={s.initial}>{user?.full_name.trim().slice(0, 1).toUpperCase()}</Text></View>
      <View style={{ flex: 1, gap: 5 }}><Text style={s.name}>{user?.full_name}</Text><Text style={s.email}>{user?.email}</Text><Text style={s.role}>{user?.role === "munshi" ? "Munshi" : user?.role === "admin" ? "Administrator" : "Advocate"}</Text></View>
    </View>
    <View>{items.map((item) => <Pressable key={item.label} accessibilityRole="button" onPress={() => router.push(item.href)} style={s.row}><Feather name={item.icon} size={21} color={colors.green} /><Text style={s.rowText}>{item.label}</Text><Feather name="chevron-right" size={19} color={colors.muted} /></Pressable>)}</View>
    <Notice>{mutation.error?.message}</Notice>
    <Action secondary icon="log-out" loading={mutation.isPending} onPress={() => Alert.alert("Sign out?", "Your account will be signed out on this phone.", [{ text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: () => mutation.mutate() }])}>Sign out</Action>
  </Screen>;
}
const s = StyleSheet.create({
  identity: { flexDirection: "row", gap: 16, alignItems: "center", paddingVertical: 20 }, avatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: "#E8F1ED", alignItems: "center", justifyContent: "center" }, initial: { color: colors.green, fontSize: 24, fontWeight: "700" },
  name: { fontSize: 20, color: colors.ink, fontWeight: "700" }, email: { color: colors.muted, fontSize: 14 }, role: { color: colors.green, fontSize: 12, fontWeight: "600" },
  row: { flexDirection: "row", gap: 14, alignItems: "center", minHeight: 66, borderBottomWidth: 1, borderColor: colors.border }, rowText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: "500" },
});
