"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/shared/Button";
import { useCasePermissions } from "@/features/cases/hooks/useCasePermissions";
import { useAuthStore } from "@/store/auth.store";
import { casesApi } from "@/lib/api/cases";
import type { Case } from "@/types/api";

export function CaseActions({ item, onDetail = false }: { item: Case; onDetail?: boolean }) {
    const user = useAuthStore(state => state.user);
    const permissions = useCasePermissions(item.id);
    const owner = user?.id === item.lawyer_id;
    const [action, setAction] = useState<"archive" | "delete" | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const dialog = useRef<HTMLDialogElement>(null);
    const router = useRouter();
    const cache = useQueryClient();
    useEffect(() => {
        if (action) dialog.current?.showModal();
        else dialog.current?.close();
    }, [action]);
    async function confirm() {
        if (busy || !action) return;
        setBusy(true); setError("");
        try {
            if (action === "delete") await casesApi.softDelete(item.id);
            else await casesApi.archive(item.id);
            // Remove potentially cached originals/details when a case is deleted.
            await cache.cancelQueries();
            cache.removeQueries({ predicate: q => q.queryKey.includes(item.id) });
            await cache.invalidateQueries();
            setAction(null);
            if (onDetail) router.replace("/cases");
        } catch (e) { setError(e instanceof Error ? e.message : "Action failed. Please retry."); }
        finally { setBusy(false); }
    }
    return <div className="flex flex-wrap items-center justify-end gap-2">
        {(owner || permissions.data?.can_edit) && <Link href={`/cases/${item.id}/edit`} className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">Edit</Link>}
        {owner && <>
            {item.status !== "archived" && <Button size="sm" variant="secondary" onClick={() => { setError(""); setAction("archive"); }}>Archive</Button>}
            <Button size="sm" variant="danger" onClick={() => { setError(""); setAction("delete"); }}>Delete</Button>
        </>}
        <dialog ref={dialog} aria-labelledby={`case-action-${item.id}`} onCancel={e => { if (busy) e.preventDefault(); else setAction(null); }} className={`m-auto w-[min(92vw,460px)] rounded-xl border-2 p-6 text-left shadow-xl backdrop:bg-black/50 ${action === "delete" ? "border-red-500 bg-red-50" : "border-slate-200 bg-white"}`}>
            <h2 id={`case-action-${item.id}`} className={`text-lg font-semibold ${action === "delete" ? "text-red-800" : "text-slate-900"}`}>{action === "delete" ? "Delete case and all documents?" : "Archive case?"}</h2>
            <p className="mt-3 break-words text-sm font-medium">{item.case_title}</p>
            <p className="mt-2 text-sm text-slate-700">{action === "delete" ? "This case and all its documents will be soft-deleted and no longer accessible in the app. Stored files are retained; this is not permanent erasure." : "The case will remain available under Archived. Its documents will not be deleted."}</p>
            {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
                <Button autoFocus variant="secondary" disabled={busy} onClick={() => setAction(null)}>Cancel</Button>
                <Button variant={action === "delete" ? "danger" : "primary"} loading={busy} onClick={() => void confirm()}>{action === "delete" ? "Delete case & documents" : "Archive case"}</Button>
            </div>
        </dialog>
    </div>;
}
