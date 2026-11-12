"use client";

import { ChamberSelector } from "@/components/chambers/ChamberSelector";
import { Button } from "@/components/shared/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader } from "@/components/ui/PageHeader";
import { Surface } from "@/components/ui/Surface";
import { chambersApi, type ChamberMembership } from "@/lib/api/chambers";
import { useChamberStore, type ChamberRole } from "@/store/chamber.store";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

const ROLES: ChamberRole[] = ["admin", "staff", "reviewer"];
export default function ChambersPage() {
  const chamber = useChamberStore((state) => state.selected);
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ChamberRole>("staff");
  const [membershipToRevoke, setMembershipToRevoke] = useState<ChamberMembership | null>(null);
  const members = useQuery({
    queryKey: ["chamber-members", chamber?.id],
    queryFn: () => chambersApi.listMembers(chamber!.id),
    enabled: Boolean(chamber),
  });
  const add = useMutation({
    mutationFn: () => chambersApi.addMember(chamber!.id, userId.trim(), role),
    onSuccess: () => {
      setUserId("");
      void queryClient.invalidateQueries({ queryKey: ["chamber-members", chamber?.id] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, nextRole, revoke }: { id: string; nextRole?: ChamberRole; revoke?: boolean }) =>
      chambersApi.updateMember(chamber!.id, id, { role: nextRole, revoke }),
    onSuccess: () => {
      setMembershipToRevoke(null);
      void queryClient.invalidateQueries({ queryKey: ["chamber-members", chamber?.id] });
    },
  });
  const canManage = chamber?.role === "owner" || chamber?.role === "admin";
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
      <PageHeader title="Chamber & members" description="Membership changes block new access immediately." />
      <Surface className="mb-5 p-1"><ChamberSelector /></Surface>
      {!chamber ? (
        <Surface className="p-6 text-sm text-slate-600">No active chamber is available for this account.</Surface>
      ) : (
        <>
          <Surface className="mb-5 p-4">
            <h2 className="text-base font-semibold text-slate-950">{chamber.name}</h2>
            <p className="mt-1 text-sm text-slate-500">Your role: {chamber.role}</p>
          </Surface>
          {canManage && (
            <Surface className="mb-5 p-4">
              <h2 className="text-sm font-semibold text-slate-900">Add member</h2>
              <p className="mt-1 text-xs text-slate-500">Enter the UUID of an existing VakilSuite user.</p>
              <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); if (userId.trim()) add.mutate(); }}>
                <input required value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User UUID" className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm" />
                <select value={role} onChange={(event) => setRole(event.target.value as ChamberRole)} className="h-10 rounded-md border border-slate-200 px-2 text-sm">{ROLES.map((item) => <option key={item}>{item}</option>)}</select>
                <Button type="submit" loading={add.isPending}>Add member</Button>
              </form>
              {add.error && <p role="alert" className="mt-2 text-sm text-red-700">{add.error.message}</p>}
            </Surface>
          )}
          <Surface className="overflow-hidden">
            <div className="border-b border-slate-200 p-4"><h2 className="text-sm font-semibold text-slate-900">Members</h2></div>
            {members.isLoading ? <p className="p-4 text-sm text-slate-500">Loading members…</p> : members.error ? <p role="alert" className="p-4 text-sm text-red-700">{members.error.message}</p> : <ul>{members.data?.map((member) => (
              <li key={member.id} className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4 last:border-0">
                <div className="min-w-0 flex-1"><p className="truncate font-mono text-xs text-slate-700">{member.user_id}</p><p className="mt-1 text-xs capitalize text-slate-500">{member.role} · {member.status}</p></div>
                {canManage && member.role !== "owner" && member.status === "active" && <>
                  <select aria-label={`Role for ${member.user_id}`} value={member.role} onChange={(event) => update.mutate({ id: member.id, nextRole: event.target.value as ChamberRole })} disabled={update.isPending} className="h-9 rounded-md border border-slate-200 px-2 text-sm disabled:opacity-60">{ROLES.map((item) => <option key={item}>{item}</option>)}</select>
                  <Button variant="danger" size="sm" disabled={update.isPending} onClick={() => setMembershipToRevoke(member)}>Revoke</Button>
                </>}
              </li>
            ))}</ul>}
          </Surface>
        </>
      )}
      <ConfirmDialog open={Boolean(membershipToRevoke)} title="Revoke chamber access?" description="This member will immediately lose new access to this chamber. Their existing work is retained." confirmLabel="Revoke access" variant="danger" loading={update.isPending} onCancel={() => setMembershipToRevoke(null)} onConfirm={() => membershipToRevoke && update.mutate({ id: membershipToRevoke.id, revoke: true })} />
    </div>
  );
}
