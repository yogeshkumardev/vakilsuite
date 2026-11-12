"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Monitor, Smartphone, LogOut } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/shared/Button";

export function DeviceSessions() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["auth-sessions"], queryFn: authApi.sessions, refetchInterval: 15000 });
  const revoke = useMutation({ mutationFn: authApi.revokeSession, onSuccess: async () => {
    await qc.invalidateQueries({ queryKey: ["auth-sessions"] });
    await authApi.me();
  } });
  const all = useMutation({ mutationFn: authApi.logoutAll });
  const user = useAuthStore((state) => state.user);
  if (!user) return null;
  return <section className="space-y-4 border-t border-slate-200 pt-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-slate-800">Signed-in devices</h2><Button variant="secondary" loading={all.isPending} onClick={() => { if (window.confirm("Sign out all web and mobile sessions, including this browser?")) all.mutate(); }}><LogOut size={16} />Sign out all</Button></div>
    {(sessions.error || revoke.error || all.error) && <p role="alert" className="text-sm text-red-700">{(sessions.error || revoke.error || all.error)?.message}</p>}
    {sessions.isLoading && <p className="text-sm text-slate-500">Loading devices...</p>}
    <div className="divide-y divide-slate-200">{sessions.data?.sessions.map((session) => <div key={session.id} className="flex flex-wrap items-center gap-4 py-4">
      {session.device_type === "web" ? <Monitor className="text-emerald-700" size={22} /> : <Smartphone className="text-emerald-700" size={22} />}
      <div className="min-w-0 flex-1"><p className="break-words text-sm font-medium text-slate-800">{session.device_name || session.device_type}</p><p className="mt-1 text-xs text-slate-500">Last active {new Date(`${session.last_seen_at}Z`).toLocaleString()}</p></div>
      <Button variant="secondary" size="sm" loading={revoke.isPending && revoke.variables === session.id} disabled={revoke.isPending || all.isPending} onClick={() => { if (window.confirm("Sign out this device?")) revoke.mutate(session.id); }}>Sign out</Button>
    </div>)}</div>
  </section>;
}
