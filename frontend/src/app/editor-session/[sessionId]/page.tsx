"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { DocxEditor } from "@/features/docx-editor";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";

type Revision = { id: string; revision_number: number; editor_document: PersistedEditorDocument };
type Detail = { title: string; latest_revision: Revision | null };
type Envelope<T> = { success: true; data: T } | { success: false; error?: { message?: string } };

function readBootstrapToken(): string {
    if (typeof window === "undefined" || !window.location.hash.startsWith("#bootstrap=")) return "";
    return decodeURIComponent(window.location.hash.slice("#bootstrap=".length));
}

async function post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const response = await fetch(`/api/v1${path}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { "X-Editor-Bootstrap-Token": token } : {}),
        },
        credentials: "omit",
        body: JSON.stringify(body),
    });
    const payload = await response.json() as Envelope<T>;
    if (!response.ok || !payload.success) throw new Error(payload.success ? "Editor session failed." : payload.error?.message ?? "Editor session failed.");
    return payload.data;
}

/** Restricted WebView page: no normal user access/refresh token ever enters it. */
export default function EditorSessionPage() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const tokenRef = useRef("");
    const [bootstrapToken, setBootstrapToken] = useState<string | undefined>(undefined);
    const [detail, setDetail] = useState<Detail | null>(null);
    const [revision, setRevision] = useState<Revision | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // A fragment is unavailable during SSR. Defer the browser-only read so
        // the server and first client render remain identical.
        void Promise.resolve().then(() => setBootstrapToken(readBootstrapToken()));
    }, []);

    useEffect(() => {
        if (!bootstrapToken) return;
        tokenRef.current = bootstrapToken;
        void post<Detail>(`/editor-sessions/${sessionId}/consume`, { token: bootstrapToken })
            .then((value) => {
                setDetail(value);
                setRevision(value.latest_revision);
                // Prevent accidental copy/share of the short-lived capability.
                window.history.replaceState({}, "", `/editor-session/${sessionId}?embedded=1`);
            })
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Editor session could not start."));
    }, [bootstrapToken, sessionId]);

    const save = useCallback(async (content: string) => {
        if (!revision || !tokenRef.current) throw new Error("Editor session expired. Return to the VakilSuite app and reopen it.");
        const next = await post<Revision>(`/editor-sessions/${sessionId}/revisions`, {
            expected_revision_number: revision.revision_number,
            client_mutation_id: crypto.randomUUID(),
            editor_document: JSON.parse(content),
        }, tokenRef.current);
        setRevision(next);
    }, [revision, sessionId]);

    if (bootstrapToken === "") return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5"><p role="alert" className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">This editor session link is incomplete or expired.</p></main>;
    if (error) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-5"><p role="alert" className="max-w-md rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p></main>;
    if (!detail || !revision) return <main className="flex min-h-dvh items-center justify-center bg-slate-50 text-sm text-slate-600">Opening secure editor…</main>;

    return <main className="flex h-dvh min-w-0 flex-col bg-white">
        <header className="shrink-0 border-b border-slate-200 px-4 py-2"><h1 className="truncate text-sm font-semibold text-slate-900">{detail.title}</h1><p className="text-xs text-slate-500">Secure document editor · revision {revision.revision_number}</p></header>
        <section className="min-h-0 flex-1"><DocxEditor allowExport={false} key={revision.id} initialContent={JSON.stringify(revision.editor_document)} onSaveContent={save} /></section>
    </main>;
}
