"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

type Item = { revision_id: string; working_document_id: string; case_id: string; title: string; revision_number: number; created_at: string };
type Envelope<T> = { success: true; data: T };

export default function ReviewInboxPage() {
    const inbox = useQuery({ queryKey: ["working-document-review-inbox"], queryFn: async () => (await apiClient.get<Envelope<Item[]>>("/cases/review-inbox")).data });
    return <WorkspacePage className="space-y-5"><div><h1 className="text-2xl font-semibold text-slate-950">Review inbox</h1><p className="mt-1 text-sm text-slate-600">Submitted working-document revisions awaiting an authorized chamber decision.</p></div>{inbox.isLoading ? <p className="text-sm text-slate-600">Loading review requests…</p> : inbox.error ? <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-800">Unable to load the review inbox. You may not have reviewer permission.</p> : inbox.data?.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">No submitted revisions need review.</p> : <div className="divide-y rounded-lg border border-slate-200 bg-white">{inbox.data?.map((item) => <Link key={item.revision_id} href={`/cases/${item.case_id}/working-documents/${item.working_document_id}`} className="flex min-h-16 items-center justify-between gap-4 p-4 hover:bg-slate-50"><span><span className="block font-medium text-slate-900">{item.title}</span><span className="text-xs text-slate-500">Revision {item.revision_number} · submitted {new Date(item.created_at).toLocaleString()}</span></span><span className="text-sm font-semibold text-indigo-700">Review</span></Link>)}</div>}</WorkspacePage>;
}
