import { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children, refreshing = false, onRefresh }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} /> : undefined}>{children}</ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Field({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={styles.input} {...props} />
    </View>
  );
}

export function Button({
  children,
  onPress,
  loading,
  disabled = false,
  variant = "primary",
}: {
  children: ReactNode;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Pressable
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: loading || disabled, busy: loading }}
      onPress={onPress}
      style={[styles.button, variant === "secondary" && styles.secondaryButton, (loading || disabled) && { opacity: 0.55 }]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? "#0f172a" : "white"} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" && styles.secondaryButtonText,
          ]}
        >
          {children}
        </Text>
      )}
    </Pressable>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    gap: 16,
    padding: 20,
  },
  title: {
    color: "#0f172a",
    fontSize: 28,
    fontWeight: "700",
  },
  muted: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    backgroundColor: "white",
    color: "#0f172a",
    paddingHorizontal: 12,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: "#126B5D",
    paddingHorizontal: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "white",
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: "#0f172a",
  },
  card: {
    gap: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    backgroundColor: "white",
    padding: 14,
  },
});
