import { useMutation } from "@tanstack/react-query";
import { signInWithGoogle } from "@/lib/googleAuth";
import { useState } from "react";
import { AuthPage, Input, Action, Notice, AuthLink, Caption } from "@/components/auth/AuthUI";
import { register } from "@/lib/api/auth";
import { emailError, passwordError } from "@/lib/validation";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const mutation = useMutation({ mutationFn: () => register(name, email, password) });
  const errors = { name: !name.trim() ? "Enter your full name." : undefined, email: emailError(email), password: passwordError(password), confirm: confirm !== password ? "Passwords do not match." : undefined };
  const google = useMutation({ mutationFn: signInWithGoogle });
  const busy = mutation.isPending || google.isPending;
  function submit() {
    setSubmitted(true);
    if (!Object.values(errors).some(Boolean) && !busy) mutation.mutate();
  }
  return <AuthPage title="Create your account" subtitle="Your VakilSuite account." footer={<><Caption>Already have an account?</Caption><AuthLink href="/(auth)/login">Sign in</AuthLink></>}>
    <Action secondary onPress={() => { mutation.reset(); google.mutate(); }} loading={google.isPending} disabled={busy}>Continue with Google</Action>
    <Notice>{google.error?.message}</Notice>
    <Caption>Or continue with email</Caption>
    <Input label="Full name" icon="user" value={name} onChangeText={setName} autoComplete="name" maxLength={200} error={submitted ? errors.name : undefined} editable={!busy} />
    <Input label="Email address" icon="mail" value={email} onChangeText={setEmail} autoComplete="email" autoCapitalize="none" keyboardType="email-address" error={submitted ? errors.email : undefined} editable={!busy} />
    <Input label="Password" icon="lock" value={password} onChangeText={setPassword} password autoComplete="new-password" placeholder="At least 8 characters" error={submitted ? errors.password : undefined} editable={!busy} />
    <Input label="Confirm password" icon="lock" value={confirm} onChangeText={setConfirm} password autoComplete="new-password" error={submitted ? errors.confirm : undefined} returnKeyType="go" onSubmitEditing={submit} editable={!busy} />
    <Notice>{mutation.error?.message}</Notice>
    <Action onPress={submit} loading={mutation.isPending} disabled={busy} icon="arrow-right">Create account</Action>
  </AuthPage>;
}
