"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { workingDocumentsApi } from "@/lib/api/working-documents";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import { DEFAULT_PAGE_LAYOUT } from "@/features/editor-core/page-layout";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

const EMPTY_DOCUMENT: PersistedEditorDocument = {
    schemaVersion: 1,
    pageLayout: DEFAULT_PAGE_LAYOUT,
    editorState: {
        root: { children: [{ children: [], direction: null, format: "", indent: 0, type: "paragraph", version: 1 }], direction: null, format: "", indent: 0, type: "root", version: 1 },
    } as unknown as PersistedEditorDocument["editorState"],
};

export default function WorkingDocumentsPage() {
    const { id: caseId } = useParams<{ id: string }>();
    const router = useRouter();
    const documents = useQuery({ queryKey: ["working-documents", caseId], queryFn: () => workingDocumentsApi.listForCase(caseId) });
    const create = useMutation({ mutationFn: () => workingDocumentsApi.create(caseId, { title: "Untitled legal draft", document_kind: "legal_draft", editor_document: EMPTY_DOCUMENT }), onSuccess: (document) => router.push(`/cases/${caseId}/working-documents/${document.id}`) });
    return <WorkspacePage className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><Link href={`/cases/${caseId}`} className="text-sm font-medium text-emerald-700 underline">Back to case</Link><h1 className="mt-2 text-2xl font-semibold text-slate-950">Draft workspace</h1><p className="mt-1 text-sm text-slate-600">Original documents and lawyer-editable drafts stay separate.</p></div><div className="flex flex-wrap gap-2"><Link href={`/cases/${caseId}/summary`} className="inline-flex min-h-11 items-center rounded-md border border-indigo-200 px-4 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">Prepare summary</Link><button type="button" onClick={() => create.mutate()} disabled={create.isPending} className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">{create.isPending ? "Creating…" : "New draft"}</button></div></div>
        {documents.error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">Unable to load drafts.</p>}
        <div className="divide-y rounded-lg border border-slate-200 bg-white">{documents.isLoading && <p className="p-5 text-sm text-slate-600">Loading drafts…</p>}{documents.data?.length === 0 && <p className="p-5 text-sm text-slate-600">No draft yet. Create one when you are ready to work from the originals.</p>}{documents.data?.map((document) => <Link key={document.id} href={`/cases/${caseId}/working-documents/${document.id}`} className="flex min-h-16 items-center justify-between gap-4 p-4 hover:bg-slate-50"><span><span className="block font-medium text-slate-900">{document.title}</span><span className="text-xs text-slate-500">Revision {document.latest_revision_number ?? 0}</span></span><span className="text-sm font-medium text-emerald-700">Open</span></Link>)}</div>
    </WorkspacePage>;
}
