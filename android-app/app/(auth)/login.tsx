import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { signInWithGoogle } from "@/lib/googleAuth";
import { useState } from "react";
import { AuthPage, Input, Action, Notice, AuthLink, Caption } from "@/components/auth/AuthUI";
import { login } from "@/lib/api/auth";
import { emailError } from "@/lib/validation";

export default function LoginScreen() {
  const { reset } = useLocalSearchParams<{ reset?: string }>();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({ mutationFn: () => login(email, password) });
  const google = useMutation({ mutationFn: signInWithGoogle });
  const busy = mutation.isPending || google.isPending;
  function submit() {
    setSubmitted(true);
    if (!emailError(email) && password && !busy) mutation.mutate();
  }
  return <AuthPage title="Welcome back" subtitle="Sign in to your practice." footer={<><Caption>New to VakilSuite?</Caption><AuthLink href="/(auth)/register">Create an account</AuthLink></>}>
    {reset === "1" && <Notice success>Password updated. Sign in with your new password.</Notice>}
    <Action secondary onPress={() => { mutation.reset(); google.mutate(); }} loading={google.isPending} disabled={busy}>Continue with Google</Action>
    <Notice>{google.error?.message}</Notice>
    <Caption>Or continue with email</Caption>
    <Input label="Email address" icon="mail" value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" error={submitted ? emailError(email) : undefined} editable={!busy} />
    <Input label="Password" icon="lock" value={password} onChangeText={setPassword} password autoComplete="current-password" error={submitted && !password ? "Enter your password." : undefined} returnKeyType="go" onSubmitEditing={submit} editable={!busy} />
    <AuthLink href="/(auth)/forgot-password">Forgot password?</AuthLink>
    <Notice>{mutation.error?.message}</Notice>
    <Action onPress={submit} loading={mutation.isPending} disabled={busy} icon="arrow-right">Sign in</Action>
  </AuthPage>;
}
