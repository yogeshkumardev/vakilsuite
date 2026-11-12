import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { AuthPage, Input, Action, Notice, AuthLink } from "@/components/auth/AuthUI";
import { resetPassword } from "@/lib/api/auth";
import { emailError, passwordError } from "@/lib/validation";

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({ mutationFn: () => resetPassword(email, code, password), onSuccess: () => router.replace({ pathname: "/(auth)/login", params: { reset: "1" } }) });
  const errors = { email: emailError(email), code: /^\d{8}$/.test(code) ? undefined : "Enter the 8-digit code.", password: passwordError(password), confirm: password === confirm ? undefined : "Passwords do not match." };
  return <AuthPage title="Reset password" subtitle="If your account is eligible, check your inbox and spam folder. Codes expire in 10 minutes." footer={<AuthLink href="/(auth)/forgot-password">Request a new code</AuthLink>}>
    <Input label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" error={submitted ? errors.email : undefined} />
    <Input label="Security code" value={code} onChangeText={setCode} keyboardType="number-pad" autoComplete="one-time-code" maxLength={8} error={submitted ? errors.code : undefined} />
    <Input label="New password" value={password} onChangeText={setPassword} password autoComplete="new-password" error={submitted ? errors.password : undefined} />
    <Input label="Confirm password" value={confirm} onChangeText={setConfirm} password autoComplete="new-password" error={submitted ? errors.confirm : undefined} />
    <Notice>{mutation.error?.message}</Notice>
    <Action loading={mutation.isPending} onPress={() => { setSubmitted(true); if (!Object.values(errors).some(Boolean)) mutation.mutate(); }}>Reset password</Action>
  </AuthPage>;
}
