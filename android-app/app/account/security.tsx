import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "react-native";
import { Action, Caption, Input, Notice } from "@/components/auth/AuthUI";
import { Screen, Title } from "@/components/ui/Screen";
import { changePassword, forgotPassword } from "@/lib/api/auth";
import { passwordError } from "@/lib/validation";
import { useAuthStore } from "@/store/auth.store";

export default function SecurityScreen() {
  const user = useAuthStore((state) => state.user);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({ mutationFn: () => changePassword(current, password) });
  const recovery = useMutation({ mutationFn: () => forgotPassword(user!.email) });
  const errors = { current: current ? undefined : "Enter your current password.", password: passwordError(password) ?? (current === password ? "Choose a different password." : undefined), confirm: confirm === password ? undefined : "Passwords do not match." };
  return <Screen><Title>Password & security</Title><Caption>Changing your password signs you out on every device.</Caption>
    <Input label="Current password" value={current} onChangeText={setCurrent} password autoComplete="current-password" error={submitted ? errors.current : undefined} />
    <Input label="New password" value={password} onChangeText={setPassword} password autoComplete="new-password" error={submitted ? errors.password : undefined} />
    <Input label="Confirm new password" value={confirm} onChangeText={setConfirm} password autoComplete="new-password" error={submitted ? errors.confirm : undefined} />
    <Notice>{mutation.error?.message}</Notice>
    <Action loading={mutation.isPending} onPress={() => { setSubmitted(true); if (!Object.values(errors).some(Boolean)) Alert.alert("Change password?", "Sign in again on your phone and browser afterwards.", [{ text: "Cancel", style: "cancel" }, { text: "Change password", onPress: () => mutation.mutate() }]); }}>Change password</Action>
    <Notice>{recovery.error?.message}</Notice>{recovery.isSuccess && <Notice success>{recovery.data.message} Sign out to reset your password.</Notice>}
    <Action secondary loading={recovery.isPending} onPress={() => recovery.mutate()}>Forgot current password?</Action>
  </Screen>;
}
