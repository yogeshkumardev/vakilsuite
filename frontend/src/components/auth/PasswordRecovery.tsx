"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Eye, EyeOff, BriefcaseBusiness } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/shared/Button";

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    if (reset && password !== confirm) { setError("Passwords do not match."); return; }
    if (reset && password.length < 15) { setError("Password must be at least 15 characters."); return; }
    if (reset && new TextEncoder().encode(password).length > 1024) { setError("Password is too long."); return; }
    setPending(true);
    try {
      const result = reset ? await authApi.resetPassword(email.trim(), code, password) : await authApi.forgotPassword(email.trim());
      setMessage(result.message);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to complete request."); }
    finally { setPending(false); }
  }

  const control = "mt-2 h-12 w-full rounded-lg border border-neutral-300 bg-white px-3 text-base text-neutral-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";
  return <main className="flex min-h-dvh items-center justify-center bg-white px-6 py-12">
    <div className="w-full max-w-sm space-y-8">
      <Link href="/login" className="flex items-center gap-3 text-xl font-semibold text-neutral-900"><BriefcaseBusiness className="text-emerald-700" />VakilSuite</Link>
      <div><h1 className="text-2xl font-semibold text-neutral-900">{reset ? "Reset your password" : "Forgot your password?"}</h1><p className="mt-3 text-sm leading-6 text-neutral-500">{reset ? "Enter the 8-digit code from your email. Codes expire after 10 minutes." : "Request a security code for your account email."}</p></div>
      {message ? <div className="space-y-5"><p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800">{message}</p><Link className="flex items-center gap-2 font-medium text-emerald-700" href={reset ? "/login" : "/reset-password"}>{reset ? "Back to sign in" : "Enter security code"}<ArrowRight size={18} /></Link></div> : <form onSubmit={submit} className="space-y-5">
        <label className="block text-sm font-medium text-neutral-700">Email address<input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={control} /></label>
        {reset && <>
          <label className="block text-sm font-medium text-neutral-700">Security code<input required inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} className={control} /></label>
          <label className="block text-sm font-medium text-neutral-700">New password<span className="relative block"><input required type={visible ? "text" : "password"} minLength={15} maxLength={1024} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${control} pr-12`} /><button type="button" title={visible ? "Hide password" : "Show password"} aria-label={visible ? "Hide password" : "Show password"} onClick={() => setVisible(!visible)} className="absolute right-0 top-2 flex h-12 w-12 items-center justify-center">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
          <label className="block text-sm font-medium text-neutral-700">Confirm password<input required type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={control} /></label>
        </>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Button type="submit" fullWidth loading={pending}>{reset ? "Reset password" : "Send code"}</Button>
      </form>}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-neutral-200 pt-5 text-sm text-emerald-700"><Link href="/login" className="flex items-center gap-2"><ArrowLeft size={16} />Sign in</Link><Link href={reset ? "/forgot-password" : "/reset-password"}>{reset ? "Request another code" : "I already have a code"}</Link></div>
    </div>
  </main>;
}
