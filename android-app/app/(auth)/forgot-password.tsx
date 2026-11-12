import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import { AuthPage, Input, Action, Notice, AuthLink } from "@/components/auth/AuthUI";
import { forgotPassword } from "@/lib/api/auth";
import { emailError } from "@/lib/validation";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({ mutationFn: () => forgotPassword(email), onSuccess: () => router.push({ pathname: "/(auth)/reset-password", params: { email: email.trim() } }) });
  return <AuthPage title="Forgot your password?" subtitle="Request a security code for your account email." footer={<AuthLink href="/(auth)/login">Back to sign in</AuthLink>}>
    <Input label="Email address" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" error={submitted ? emailError(email) : undefined} />
    <Notice>{mutation.error?.message}</Notice>
    <Action loading={mutation.isPending} onPress={() => { setSubmitted(true); if (!emailError(email)) mutation.mutate(); }} icon="mail">Send code</Action>
    <AuthLink href={{ pathname: "/(auth)/reset-password", params: { email } }}>I already have a code</AuthLink>
  </AuthPage>;
}
