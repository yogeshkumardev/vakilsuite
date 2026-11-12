"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { DocxEditor } from "@/features/docx-editor";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import { base64ToArrayBuffer } from "@/features/docx-editor/content-conversion";
import { useDocuments } from "@/features/documents/hooks/useDocuments";
import { ApiClientError } from "@/lib/api/client";
import { workingDocumentsApi } from "@/lib/api/working-documents";
import { exportsApi, saveDownloadedFile, type ExportFormat } from "@/lib/api/exports";

type FocusMode = "editor" | "original";

export function WorkingDocumentWorkspace(props: { caseId: string; workingDocumentId: string; embedded?: boolean; showOriginals?: boolean }) {
    const generation = useAuthStore(s=>s.generation);
    const chamber = useChamberStore(s=>s.selected?.id);
    const scope = `${generation}:${chamber}`;
    return <ScopedWorkingDocumentWorkspace key={`${scope}:${props.workingDocumentId}`} {...props} showOriginals={props.showOriginals ?? false} scope={scope}/>;
}

function ScopedWorkingDocumentWorkspace({ caseId, workingDocumentId, scope, embedded, showOriginals = false }: { caseId: string; workingDocumentId: string; scope: string; embedded?: boolean; showOriginals?: boolean }) {
    const [dirty, setDirty] = useState(false);
    const [savedRevisionNumber, setSavedRevisionNumber] = useState<number | null>(null);
    const [reviewBusy, setReviewBusy] = useState(false);
    const [focusMode, setFocusMode] = useState<FocusMode>("editor");
    const [selectedOriginalId, setSelectedOriginalId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [isHeaderExporting, setIsHeaderExporting] = useState<"docx" | "pdf" | null>(null);
    const [exportJob, setExportJob] = useState<{ id: string; format: "docx" | "pdf" } | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [reviewComment, setReviewComment] = useState("");
    const revisionNumber = useRef<number | null>(null);

    const documentQuery = useQuery({
        queryKey: ["working-document", scope, workingDocumentId],
        queryFn: () => workingDocumentsApi.get(workingDocumentId),
    });
    const originalsQuery = useDocuments(caseId);

    const saveMutation = useMutation({
        mutationFn: async (editorDocument: PersistedEditorDocument) => {
            const expectedRevisionNumber = revisionNumber.current ?? documentQuery.data?.latest_revision?.revision_number;
            if (expectedRevisionNumber === undefined) throw new Error("The document revision is unavailable.");
            return workingDocumentsApi.createRevision(workingDocumentId, {
                expected_revision_number: expectedRevisionNumber,
                client_mutation_id: crypto.randomUUID(),
                editor_document: editorDocument,
            });
        },
        onSuccess: (revision) => {
            revisionNumber.current = revision.revision_number;
            setSavedRevisionNumber(revision.revision_number);
            setNotice(`Saved revision ${revision.revision_number}. Ready for review or download.`);
            setExportJob(null);
        },
    });

    const exportStatus = useQuery({
        queryKey: ["working-document-export", scope, exportJob?.id],
        queryFn: () => workingDocumentsApi.getJob(exportJob!.id),
        enabled: Boolean(exportJob),
        refetchInterval: (query) => ["queued", "running"].includes(query.state.data?.status ?? "") ? 1500 : false,
    });

    const detail = documentQuery.data;
    const latest = detail?.latest_revision ?? null;

    const originals = originalsQuery.data ?? [];
    const selectedOriginal = originals.find((item) => item.id === selectedOriginalId) ?? originals[0] ?? null;
    const initialContent = useMemo(() => latest ? JSON.stringify(latest.editor_document) : null, [latest]);

    const save = useCallback(async (content: string) => {
        setNotice(null);
        try {
            await saveMutation.mutateAsync(JSON.parse(content) as PersistedEditorDocument);
        } catch (error) {
            if (error instanceof ApiClientError && error.status === 409) {
                setNotice("Another revision was saved. Reload this document before continuing.");
            }
            throw error;
        }
    }, [saveMutation]);

    // Direct render & download using exportsApi
    // NOTE: `content` from onExportDocument is a raw base64 DOCX string (NOT JSON).
    const handleDirectExport = useCallback(async (content: string, format: ExportFormat) => {
        setNotice(null);
        setExportError(null);
        try {
            if (format === "docx") {
                // content is raw base64 DOCX — decode and trigger browser download directly
                const buffer = base64ToArrayBuffer(content);
                const blob = new Blob([buffer], {
                    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });
                const url = URL.createObjectURL(blob);
                const a = window.document.createElement("a");
                a.href = url;
                a.download = `${detail?.title ?? "document"}.docx`;
                a.click();
                URL.revokeObjectURL(url);
                return;
            }
            // For other formats (PDF, etc.) — render via backend using the stored editor_document
            const file = await exportsApi.render({
                title: detail?.title ?? "Legal Draft",
                file_name: detail?.title ?? "legal-draft",
                output_format: format,
                document: latest?.editor_document as unknown as PersistedEditorDocument,
            });
            saveDownloadedFile(file);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "Export failed.");
            throw error;
        }
    }, [detail?.title, latest?.editor_document]);

    const handleHeaderDownload = async (format: ExportFormat) => {
        if (!latest?.editor_document || isHeaderExporting) return;
        setIsHeaderExporting(format);
        setNotice(null);
        setExportError(null);
        try {
            const file = await exportsApi.render({
                title: detail?.title ?? "Legal Draft",
                file_name: detail?.title ?? "legal-draft",
                output_format: format,
                document: latest.editor_document as unknown as PersistedEditorDocument,
            });
            saveDownloadedFile(file);
            setNotice(`✓ ${format.toUpperCase()} downloaded successfully!`);
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "Download failed.");
        } finally {
            setIsHeaderExporting(null);
        }
    };

    const startExport = useCallback(async (format: "docx" | "pdf") => {
        if (!latest || latest.status !== "approved" || dirty || (revisionNumber.current !== null && revisionNumber.current !== latest.revision_number)) return;
        setNotice(null);
        setExportError(null);
        try {
            const job = await workingDocumentsApi.enqueueExport(workingDocumentId, { revision_id: latest.id, expected_content_sha256: latest.content_sha256, output_format: format, idempotency_key: crypto.randomUUID() });
            setExportJob({ id: job.id, format });
        } catch (error) {
            setExportError(error instanceof Error ? error.message : "Could not start export.");
        }
    }, [latest, workingDocumentId, dirty]);

    const submitForReview = useCallback(async () => {
        if (!latest) return;
        await workingDocumentsApi.submitRevision(workingDocumentId, latest.id, latest.content_sha256);
        setNotice("Revision submitted for review.");
        await documentQuery.refetch();
    }, [documentQuery, latest, workingDocumentId]);

    const decide = useCallback(async (action: "approve" | "request_changes" | "revoke") => {
        if (!latest) return;
        await workingDocumentsApi.decideRevision(workingDocumentId, latest.id, { action, expected_content_sha256: latest.content_sha256, comment: reviewComment || undefined });
        setNotice(action === "approve" ? "Revision approved." : action === "request_changes" ? "Changes requested." : "Approval revoked.");
        await documentQuery.refetch();
    }, [documentQuery, latest, reviewComment, workingDocumentId]);

    async function reviewAction(action: () => Promise<void>) {
        if (reviewBusy || dirty || (savedRevisionNumber !== null && savedRevisionNumber !== latest?.revision_number)) {
            setNotice("Save and reload the latest revision before review.");
            return;
        }
        setReviewBusy(true);
        try { await action(); } catch (error) { setNotice(error instanceof Error ? error.message : "Review could not be saved."); }
        finally { setReviewBusy(false); }
    }

    if (documentQuery.isLoading) return <main className="grid min-h-[50vh] place-items-center text-sm text-slate-600">Opening draft workspace…</main>;
    if (documentQuery.error || !detail || !latest) return <main className="mx-auto max-w-xl p-8"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">This working document is unavailable or has no editable revision.</p><Link className="mt-4 inline-block text-sm font-medium text-emerald-700 underline" href={`/cases/${caseId}/drafts`}>Back to drafts</Link></main>;

    return <main className={`flex min-w-0 flex-col bg-slate-50 overflow-hidden ${embedded ? "h-full min-h-0 flex-1" : "h-[calc(100dvh-3.5rem)]"}`}>
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5 text-xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                {!embedded && (
                    <Link href={`/cases/${caseId}/drafts`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1 shrink-0 mr-1">
                        ← All Drafts
                    </Link>
                )}
                <h1 className="truncate text-xs font-bold text-slate-900 max-w-xs sm:max-w-md">{detail.title}</h1>
                <span className="text-[11px] text-slate-500 shrink-0">
                    v{latest.revision_number} · <span className="capitalize">{latest.status.replaceAll("_", " ")}</span>
                </span>
                <span className="text-[11px] font-medium hidden md:inline shrink-0">
                    {dirty ? <span className="text-amber-600">● Unsaved edits</span> : <span className="text-emerald-600">✓ Saved</span>}
                </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                {/* Direct DOCX & PDF Download & Print */}
                <button
                    type="button"
                    title="Download editable Microsoft Word (.docx)"
                    disabled={saveMutation.isPending || isHeaderExporting !== null}
                    onClick={() => handleHeaderDownload("docx")}
                    className="h-7 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait transition"
                >
                    {isHeaderExporting === "docx" ? "⏳ DOCX…" : "📝 DOCX"}
                </button>
                <button
                    type="button"
                    title="Download printable PDF document"
                    disabled={saveMutation.isPending || isHeaderExporting !== null}
                    onClick={() => handleHeaderDownload("pdf")}
                    className="h-7 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-60 disabled:cursor-wait transition"
                >
                    {isHeaderExporting === "pdf" ? "⏳ PDF…" : "📄 PDF"}
                </button>
                <button
                    type="button"
                    title="Print petition"
                    onClick={() => window.print()}
                    className="h-7 inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                >
                    🖨️
                </button>

                {latest.status === "saved" || latest.status === "changes_requested" ? (
                    <button
                        type="button"
                        disabled={reviewBusy || dirty}
                        onClick={() => void reviewAction(submitForReview)}
                        className="h-7 rounded-md bg-indigo-600 px-2.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs transition"
                    >
                        Submit Review
                    </button>
                ) : null}

                <button
                    type="button"
                    onClick={() => {
                        revisionNumber.current = null;
                        setSavedRevisionNumber(null);
                        void documentQuery.refetch();
                    }}
                    className="h-7 rounded-md border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                    title="Reload latest revision from server"
                >
                    ↻
                </button>
            </div>
        </header>

        {exportJob && (
            <div role="status" className="shrink-0 border-b border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-900">
                {exportStatus.data?.status === "succeeded" ? (
                    <button
                        type="button"
                        className="font-semibold underline"
                        onClick={() => window.open(workingDocumentsApi.downloadExportUrl(workingDocumentId, exportJob.id), "_blank", "noopener,noreferrer")}
                    >
                        Download {exportJob.format.toUpperCase()} approved draft{exportStatus.data.result_summary?.file_name ? `: ${exportStatus.data.result_summary.file_name}` : ""}
                    </button>
                ) : exportStatus.data?.status === "failed" ? (
                    <span>Export failed: {exportStatus.data.error_message ?? "please retry"}. <button type="button" onClick={() => void startExport(exportJob.format)} className="font-semibold underline">Retry this export</button></span>
                ) : (
                    `Preparing ${exportJob.format.toUpperCase()} export…`
                )}
            </div>
        )}
        {exportError && <div role="alert" className="shrink-0 border-b border-red-200 bg-red-50 px-3 py-1 text-xs text-red-800">{exportError}</div>}
        {notice && <div role="status" className="shrink-0 border-b border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-900">{notice}</div>}
        {latest.status === "submitted" && (
            <section className="shrink-0 border-b border-indigo-200 bg-indigo-50 px-3 py-1.5 flex items-center gap-2 text-xs">
                <span className="font-bold text-indigo-950 uppercase tracking-wide shrink-0">Review:</span>
                <input
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    maxLength={2000}
                    placeholder="Comment (optional)"
                    className="h-7 rounded-md border border-indigo-200 bg-white px-2.5 text-xs flex-1 max-w-sm"
                />
                <button
                    type="button"
                    disabled={reviewBusy || dirty}
                    onClick={() => void reviewAction(() => decide("approve"))}
                    className="h-7 rounded-md bg-emerald-600 px-2.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                    Approve
                </button>
                <button
                    type="button"
                    disabled={reviewBusy || dirty}
                    onClick={() => void reviewAction(() => decide("request_changes"))}
                    className="h-7 rounded-md border border-amber-500 bg-amber-50 px-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                    Request changes
                </button>
            </section>
        )}

        {showOriginals && (
            <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
                <button type="button" onClick={() => setFocusMode("editor")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${focusMode === "editor" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Draft Editor</button>
                <button type="button" onClick={() => setFocusMode("original")} className={`min-h-9 rounded-md px-3 text-xs font-semibold ${focusMode === "original" ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}>Originals ({originals.length})</button>
            </div>
        )}

        <div className={`min-h-0 flex-1 ${showOriginals ? "lg:grid lg:grid-cols-2" : "flex flex-col"}`}>
            {showOriginals && (
                <aside className={`${focusMode === "original" ? "flex" : "hidden"} min-h-0 flex-col border-r border-slate-200 bg-slate-100/50 lg:flex`}>
                    <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-slate-200 bg-white p-2">
                        {originals.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedOriginalId(item.id)}
                                className={`min-h-8 shrink-0 rounded-md px-2.5 text-left text-xs font-medium transition ${
                                    selectedOriginal?.id === item.id ? "bg-indigo-50 text-indigo-800 border border-indigo-200 font-semibold" : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                                }`}
                            >
                                📄 {item.original_filename}
                            </button>
                        ))}
                        {originals.length === 0 && <p className="p-2 text-xs text-slate-500">No original document attached to this case.</p>}
                    </div>
                    <div className="min-h-0 flex-1">
                        {selectedOriginal && <DocumentPreview documentId={selectedOriginal.id} mimeType={selectedOriginal.mime_type} filename={selectedOriginal.original_filename} active />}
                    </div>
                </aside>
            )}

            <section className="min-h-0 flex-1 flex flex-col w-full h-full" aria-label="Working document editor">
                <DocxEditor
                    key={latest.id}
                    initialContent={initialContent}
                    onDirtyChange={setDirty}
                    allowExport={true}
                    onExportDocument={handleDirectExport}
                    onSaveContent={save}
                />
            </section>
        </div>
    </main>;
}
