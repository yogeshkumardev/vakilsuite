"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { Button } from "@/components/shared/Button";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [flow, setFlow] = useState<string | null>(null);
  const [message, setMessage] = useState("Enter your email to request a verification code.");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function request(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try { const data = await authApi.requestEmailVerification(email.trim()); setFlow(data.verification_flow); setMessage(data.message); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to request a code."); }
    finally { setPending(false); }
  }
  async function confirm(event: FormEvent) {
    event.preventDefault(); if (!flow) return; setPending(true); setError("");
    try { await authApi.confirmEmailVerification(flow, code); router.push("/login"); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to verify this code."); }
    finally { setPending(false); }
  }
  const control = "mt-2 h-11 w-full rounded-md border border-slate-300 px-3";
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4"><div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm"><h1 className="text-xl font-semibold">Verify your email</h1><p className="mt-2 text-sm text-slate-600">{message}</p>{!flow ? <form className="mt-5 space-y-4" onSubmit={request}><label className="block text-sm font-medium">Email address<input className={control} type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><Button fullWidth loading={pending}>Send verification code</Button></form> : <form className="mt-5 space-y-4" onSubmit={confirm}><label className="block text-sm font-medium">8-digit code<input className={control} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}" maxLength={8} required value={code} onChange={e => setCode(e.target.value)} /></label><Button fullWidth loading={pending}>Verify email</Button><button type="button" className="text-sm text-indigo-600" onClick={() => setFlow(null)}>Request another code</button></form>}{error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}<Link className="mt-5 block text-sm text-indigo-600" href="/login">Back to sign in</Link></div></main>;
}
