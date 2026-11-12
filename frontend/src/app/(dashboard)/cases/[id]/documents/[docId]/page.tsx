"use client";

import Link from "next/link";
import { DocumentSourceWorkspace } from "@/features/documents/sources/DocumentSourceWorkspace";
import { useParams } from "next/navigation";
import { useDocument, useConfirmUpload } from "@/features/documents/hooks/useDocuments";
import { useCasePermissions } from "@/features/cases/hooks/useCasePermissions";

export default function OriginalDocumentPage() {
    const { id: caseId, docId } = useParams<{ id: string; docId: string }>();
    const query = useDocument(docId);
    const permissions = useCasePermissions(caseId);
    const confirm = useConfirmUpload(docId);
    const document = query.data;

    if (query.isPending) return <p className="p-6">Loading document…</p>;
    if (query.isError || !document || document.case_id !== caseId) return (
        <section className="space-y-3 p-6"><p role="alert">Document is unavailable. Please try again or return to your documents.</p>
            <button className="underline" onClick={() => void query.refetch()}>Retry</button>{" "}
            <Link href={`/cases/${caseId}?tab=documents`} className="underline">Back to documents</Link>
        </section>
    );

    return (
        <section className="flex h-full min-h-[500px] flex-col gap-2 p-3 sm:px-5 sm:py-3">
            <header className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 pb-2">
                <Link href={`/cases/${caseId}?tab=documents`} className="inline-flex min-h-11 items-center text-sm text-emerald-700 hover:underline sm:min-h-8">← Documents</Link>
                <h1 className="min-w-0 flex-1 basis-64 break-words text-base font-semibold" title={document.display_name ?? document.original_filename}>{document.display_name ?? document.original_filename}</h1>
                <p className="text-xs text-slate-500">{document.upload_status} · {(document.file_size_bytes / 1024).toFixed(1)} KB · Original file</p>
            </header>
            {document.upload_status !== "uploaded" ? (
                <div className="space-y-3 rounded-lg bg-amber-50 p-4 text-sm">
                    <p>{document.upload_status === "quarantined" ? "This original was rejected during server verification. It cannot be viewed or processed; upload a clean replacement from the Documents page." : "Upload is not confirmed. If the file already reached storage, retry confirmation. Otherwise retry from the uploader."}</p>
                    {document.upload_status !== "quarantined" && permissions.data?.can_edit && <button disabled={confirm.isPending} className="underline disabled:opacity-50" onClick={() => confirm.mutate()}>
                        {confirm.isPending ? "Confirming…" : "Retry confirmation"}
                    </button>}
                    {confirm.error && <p role="alert">{confirm.error.message}</p>}
                </div>
            ) : (
                <DocumentSourceWorkspace documentId={docId} caseId={caseId} mimeType={document.mime_type} filename={document.original_filename} />
            )}
        </section>
    );
}
