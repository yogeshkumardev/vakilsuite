import Feather from "@expo/vector-icons/Feather";
import { Link, type Href } from "expo-router";
import { type ComponentProps, type ReactNode, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export const colors = { ink: "#182626", muted: "#657372", green: "#126B5D", border: "#DCE4E1", red: "#B42332", pale: "#EEF5F2" };

export function AuthPage({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <SafeAreaView style={s.safe}>
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          <View style={s.brand}><Feather name="briefcase" size={24} color={colors.green} /><Text style={s.brandText}>VakilSuite</Text></View>
          <View style={s.heading}><Text accessibilityRole="header" style={s.title}>{title}</Text>{subtitle && <Text style={s.subtitle}>{subtitle}</Text>}</View>
          <View style={s.form}>{children}</View>
          {footer && <View style={s.footer}>{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Input({ label, error, password, icon, ...props }: TextInputProps & { label: string; error?: string; password?: boolean; icon?: ComponentProps<typeof Feather>["name"] }) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, focused && s.focused, Boolean(error) && s.invalid]}>
        {icon && <Feather name={icon} size={18} color={colors.muted} />}
        <TextInput {...props} accessibilityLabel={label} autoCapitalize={props.autoCapitalize ?? (password ? "none" : "sentences")} autoCorrect={false} secureTextEntry={password && !visible} placeholderTextColor="#85928E" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} style={s.input} />
        {password && <Pressable accessibilityRole="button" accessibilityLabel={visible ? "Hide password" : "Show password"} onPress={() => setVisible(!visible)} hitSlop={8} style={s.eye}><Feather name={visible ? "eye-off" : "eye"} size={20} color={colors.muted} /></Pressable>}
      </View>
      {error && <Text accessibilityLiveRegion="polite" style={s.error}>{error}</Text>}
    </View>
  );
}

export function Action({ children, onPress, loading, disabled, secondary = false, icon }: { children: string; onPress: () => void; loading?: boolean; disabled?: boolean; secondary?: boolean; icon?: ComponentProps<typeof Feather>["name"] }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [s.action, secondary && s.secondary, (disabled || loading || pressed) && { opacity: 0.65 }]}>
    {loading ? <ActivityIndicator color={secondary ? colors.green : "white"} /> : <><Text style={[s.actionText, secondary && { color: colors.green }]}>{children}</Text>{icon && <Feather name={icon} size={18} color={secondary ? colors.green : "white"} />}</>}
  </Pressable>;
}

export function Notice({ children, success }: { children?: ReactNode; success?: boolean }) {
  if (!children) return null;
  return <View accessibilityLiveRegion="polite" style={[s.notice, success && { backgroundColor: colors.pale }]}><Feather name={success ? "check-circle" : "alert-circle"} size={18} color={success ? colors.green : colors.red} /><Text style={[s.noticeText, success && { color: colors.green }]}>{children}</Text></View>;
}

export function AuthLink({ href, children }: { href: Href; children: string }) {
  return <Link href={href} style={s.link}>{children}</Link>;
}

export function Caption({ children }: { children: ReactNode }) {
  return <Text style={s.subtitle}>{children}</Text>;
}

const s = StyleSheet.create({
  flex: { flex: 1 }, safe: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { flexGrow: 1, padding: 24, paddingTop: 36, gap: 30, width: "100%", maxWidth: 480, alignSelf: "center" },
  brand: { flexDirection: "row", alignItems: "center", gap: 12 }, brandText: { fontSize: 23, fontWeight: "700", color: colors.ink },
  heading: { gap: 10, paddingTop: 12 }, title: { fontSize: 30, lineHeight: 38, color: colors.ink, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 22, color: colors.muted }, form: { gap: 20 }, footer: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 22, gap: 12, paddingBottom: 16 },
  field: { gap: 8 }, label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  inputRow: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, backgroundColor: "#FAFCFB", flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 10, minHeight: 54 },
  focused: { borderColor: colors.green }, invalid: { borderColor: colors.red }, input: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 16, paddingVertical: 14 }, eye: { minHeight: 44, width: 36, justifyContent: "center", alignItems: "center" },
  action: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.green, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10 },
  actionText: { color: "white", fontSize: 15, fontWeight: "700", flexShrink: 1, textAlign: "center" }, secondary: { backgroundColor: colors.pale },
  notice: { backgroundColor: "#FFF1F2", borderRadius: 8, padding: 14, flexDirection: "row", alignItems: "flex-start", gap: 10 }, noticeText: { flex: 1, color: colors.red, fontSize: 14, lineHeight: 20 },
  error: { color: colors.red, fontSize: 12, lineHeight: 18 }, link: { color: colors.green, fontWeight: "600", fontSize: 14, paddingVertical: 8 },
});
