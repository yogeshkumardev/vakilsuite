"use client";
import "./document-workspace.css";
import { typingFailureMessage, sourceFailureMessage, retrySourceInspection } from "./source-errors";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast, useDismissToast } from "@/components/shared/ToastProvider";
import { useChamberStore } from "@/store/chamber.store";
import { useAuthStore } from "@/store/auth.store";
import { DocumentPreview } from "@/components/documents/DocumentPreview";
import { getSourceOcrStatus, inspectOriginal, saveSourceEditor, reviewSourceEditor, repairSourceEditor, quotePage, transcribePage, type OriginalSource, type SourceOcrStatus } from "@/lib/api/original-sources";
import { DocxEditor } from "@/features/docx-editor";
import { hasText, initialSourceContent } from "./source-editor-content";
const button = "min-h-11 sm:min-h-8 rounded-md border border-slate-200 px-3 py-1 text-sm font-medium focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50";
type Props = {
    documentId: string;
    caseId: string;
    mimeType: string;
    filename: string;
};
export function DocumentSourceWorkspace(props: Props) {
    const generation = useAuthStore(s => s.generation);
    const chamberId = useChamberStore(s => s.selected?.id);
    return <ScopedWorkspace key={`${generation}:${chamberId}:${props.documentId}`} {...props} generation={generation} chamberId={chamberId}/>;
}
function ScopedWorkspace(props: Props & {
    generation: number;
    chamberId?: string;
}) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const dismissToast = useDismissToast();
    const [watchTyping, setWatchTyping] = useState(false);
    const [editing, setEditing] = useState(false);
    const [tab, setTab] = useState<"original" | "editor">("original");
    const [split, setSplit] = useState(false);
    const supported = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(props.mimeType);
    const query = useQuery({ queryKey: ["original-source-v3", props.generation, props.chamberId, props.documentId], queryFn: () => inspectOriginal(props.documentId), enabled: supported, retry: retrySourceInspection, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), refetchOnWindowFocus: false, refetchOnReconnect: false });
    const shouldPollTyping = Boolean(supported && query.data && !editing && (watchTyping || ["queued", "running"].includes(query.data.ocr_status ?? "")));
    const ocrStatusQuery = useQuery({ queryKey: ["original-source-ocr-status-v1", props.generation, props.chamberId, props.documentId], queryFn: () => getSourceOcrStatus(props.documentId), enabled: shouldPollTyping, retry: retrySourceInspection, retryDelay: attempt => Math.min(1000 * 2 ** attempt, 5000), refetchOnWindowFocus: false, refetchOnReconnect: false,
        refetchInterval: q => ["queued", "running"].includes(q.state.data?.status ?? "") ? (q.state.error ? 10000 : 2500) : false });
    const terminalOcrStatus = ocrStatusQuery.data?.status;
    const isTerminalOcrStatus = ["succeeded", "failed", "cancelled"].includes(terminalOcrStatus ?? "");
    const sourceOcrStatus = query.data?.ocr_status;
    const refetchSource = query.refetch;
    useEffect(() => {
        if (!isTerminalOcrStatus || sourceOcrStatus === terminalOcrStatus) return;
        void refetchSource();
    }, [isTerminalOcrStatus, terminalOcrStatus, sourceOcrStatus, refetchSource]);
    useEffect(() => {
        if (query.error) toast({ id: `source-load:${props.documentId}`, tone: "warning", message: sourceFailureMessage(query.error, "load") });
        else if (query.data) dismissToast(`source-load:${props.documentId}`);
    }, [query.error, query.data, props.documentId, toast, dismissToast]);
    useEffect(() => {
        if (shouldPollTyping && ocrStatusQuery.error) toast({ id: `typing-status:${props.documentId}`, tone: "warning", message: sourceFailureMessage(ocrStatusQuery.error, "type") });
        else if (!ocrStatusQuery.error) dismissToast(`typing-status:${props.documentId}`);
    }, [shouldPollTyping, ocrStatusQuery.error, props.documentId, toast, dismissToast]);
    const original = <DocumentPreview documentId={props.documentId} mimeType={props.mimeType} filename={props.filename} active/>;
    if (!query.data || query.data.mode === "direct_pdf")
        return <div className="flex flex-1 flex-col gap-3">
 <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
 {query.isPending && supported ? <span role="status">Opening original…</span> : <span>{query.data?.mode === "direct_pdf" ? "Digital PDF · Original will be read directly when you generate the case summary." : "Original document"}</span>}
 </div>
 {Boolean(query.error) && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"><p>Text workspace is waiting to reconnect. You can still view the original below.</p><button className={button} disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? "Reconnecting…" : "Retry text workspace"}</button></div>}
 <div className="h-[75vh] min-h-[420px] overflow-hidden rounded-lg border">{original}</div></div>;
    return <ScannedWorkspace key={`${query.data.file_version_id}:${query.data.editor_version}:${query.data.mode}`} {...props} source={query.data} ocrStatus={ocrStatusQuery.data} typingResultPending={Boolean(isTerminalOcrStatus && terminalOcrStatus !== sourceOcrStatus)} tab={tab} setTab={setTab} split={split} setSplit={setSplit} refreshTypingStatus={() => { setWatchTyping(true); void ocrStatusQuery.refetch(); }} refreshSource={() => { void refetchSource(); }} onEditingChange={setEditing} onReviewConfirmed={() => queryClient.invalidateQueries({ queryKey: ["summary-source-candidates", props.generation, props.chamberId, props.caseId] })} sourceConnectionPending={Boolean(query.error)} connectionPending={Boolean(query.error) || Boolean(shouldPollTyping && ocrStatusQuery.error)} original={original}/>;
}
function ScannedWorkspace({ source, ocrStatus, typingResultPending, documentId, original, refreshTypingStatus, refreshSource, tab, setTab, split, setSplit, onEditingChange, onReviewConfirmed, sourceConnectionPending, connectionPending }: Props & {
    tab: "original" | "editor";
    setTab: (tab: "original" | "editor") => void;
    split: boolean;
    setSplit: (split: boolean) => void;
    onEditingChange: (editing: boolean) => void;
    onReviewConfirmed: () => Promise<unknown>;
    connectionPending: boolean;
    sourceConnectionPending: boolean;
    source: OriginalSource;
    ocrStatus?: SourceOcrStatus;
    typingResultPending: boolean;
    refreshTypingStatus: () => void;
    refreshSource: () => void;
    original: React.ReactNode;
}) {
    const toast = useToast();
    const dismissToast = useDismissToast();
    const [dirty, setDirty] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [saved, setSaved] = useState(source);
    const [repairing,setRepairing]=useState(false);
    const [job, setJob] = useState<{
        status: string;
        sourceAtSubmit: OriginalSource;
    } | null>(null);
    const typingClickLocked = useRef(false);
    const reviewClickLocked = useRef(false);
    const version = useRef(source.editor_version);
    const savedContent = useRef(source.editor_document);
    const initial = initialSourceContent(source.editor_document);
    const textReady = hasText(saved.editor_document);
    const sourceHasTypedText = hasText(source.editor_document);
    const currentOcrStatus = ocrStatus?.status ?? (job?.sourceAtSubmit === source ? job.status : source.ocr_status);
    const busy = ["queued", "running"].includes(currentOcrStatus ?? "");
    const queued = currentOcrStatus === "queued";
    const typed = source.ocr_status === "succeeded" && sourceHasTypedText;
    const typingResultMissing = source.ocr_status === "succeeded" && !sourceHasTypedText;
    const finalized = ["reviewed","needs_provenance_repair"].includes(saved.mode) && !repairing;
    useEffect(() => { onEditingChange(dirty || repairing); }, [dirty, repairing, onEditingChange]);
    useEffect(() => {
        if (finalized) return;
        if (source.ocr_status === "succeeded") {
            dismissToast(`typing-status:${documentId}`);
            toast({ id: `typing:${documentId}`, tone: "success", message: "Typed text is ready in Text editor. Compare it with the original, then confirm your review." });
        }
        if (["failed", "cancelled"].includes(source.ocr_status ?? "")) {
            dismissToast(`typing-status:${documentId}`);
            toast({ id: `typing:${documentId}`, tone: "warning", message: typingFailureMessage(source.ocr_error, source.ocr_can_restart) });
        }
    }, [source.ocr_status, source.ocr_error, source.ocr_can_restart, documentId, toast, dismissToast, finalized]);
    useEffect(() => {
        if (!dirty && !repairing) return;
        const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty, repairing]);
    const body = { page_number: 0, expected_source_sha256: source.source_sha256 };
    const submit = useMutation({ mutationFn: async () => {
        if (dirty || (busy && !queued) || finalized || typed) throw new Error("Wait for text to save before starting document typing.");
        const quote = await quotePage(documentId, body);
        // Same user action: estimate, enforce policy/budget, then enqueue exactly once.
        return transcribePage(documentId, { ...body, expected_quote_hash: quote.quote_hash,
            ...(source.ocr_can_retry ? {confirmed_retry_attempt: source.ocr_attempt_count} : {}) });
    }, onSuccess: result => { setJob({...result, sourceAtSubmit: source}); setNotice(["queued", "running"].includes(result.status) ? "Typing the document… The text will appear in this editor when ready." : null); toast({ id: `typing:${documentId}`, message: "Typing requested. You can keep the document open; text will appear here when ready." }); refreshTypingStatus(); }, onError: error => { toast({ id: `typing:${documentId}`, tone: "warning", message: sourceFailureMessage(error, "type") }); refreshTypingStatus(); }, onSettled: () => { typingClickLocked.current = false; } });
    const save = useCallback(async (content: string) => {
        try {
            if (repairing) { savedContent.current=JSON.parse(content); setNotice("Repair held locally. Mark the whole document reviewed to save a new immutable revision."); return; }
            const result = await saveSourceEditor(documentId, { expected_source_sha256: source.source_sha256, expected_editor_version: version.current, editor_document: JSON.parse(content) });
            version.current = result.editor_version;
            savedContent.current = result.editor_document;
            setSaved(result);
            setNotice("Text saved. Review it against the original before confirming.");
            dismissToast(`save:${documentId}`);
        }
        catch (error) {
            setNotice(sourceFailureMessage(error, "save"));
            toast({ id: `save:${documentId}`, tone: "warning", message: sourceFailureMessage(error, "save") });
            throw error;
        }
    }, [documentId, source.source_sha256, repairing, toast, dismissToast]);
    const review = useMutation({ mutationFn: () => (repairing?repairSourceEditor:reviewSourceEditor)(documentId, { expected_source_sha256: source.source_sha256, expected_editor_version: version.current, editor_document: savedContent.current!, confirmed: true }), onSuccess: result => { setSaved(result); version.current=result.editor_version; setRepairing(false); setNotice("Reviewed text is ready for the case summary."); dismissToast(`typing:${documentId}`); void onReviewConfirmed(); toast({ id: `review:${documentId}`, tone: "success", message: "Review confirmed. This text is ready for the case summary." }); }, onError: error => toast({ id: `review:${documentId}`, tone: "warning", message: sourceFailureMessage(error, "review") }), onSettled: () => { reviewClickLocked.current = false; } });
    return <div className="document-source-workspace flex min-w-0 flex-1 flex-col gap-2">
 <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-1 py-1">
 <div className="flex gap-1" role="tablist" aria-label="Document view">
 {(["original", "editor"] as const).map((value, index) => <button key={value} role="tab" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1} onKeyDown={e => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        setTab(value === "original" ? "editor" : "original");
        (e.currentTarget.parentElement?.children[1 - index] as HTMLButtonElement)?.focus();
    } }} onClick={() => { setTab(value); setSplit(false); }} className={`${button} ${tab === value ? "bg-indigo-50 text-indigo-800" : "bg-white"}`}>{value === "original" ? "Original" : "Text editor"}</button>)}
 </div><div className="flex flex-wrap items-center gap-2">
 {!finalized && !repairing && !typed && (!source.ocr_status || source.ocr_can_retry) && !busy && <button className={`${button} bg-indigo-600 text-white`} title="Uses AI within your configured budget. Review the typed text against the original." disabled={dirty || submit.isPending || busy || typed || review.isPending || connectionPending} onClick={() => {
     if (typingClickLocked.current || dirty || busy || typed || finalized || submit.isPending) return;
     if (source.ocr_can_retry && source.ocr_retry_may_charge && !window.confirm("Start a new typing attempt? The previous attempt may already have incurred a charge. This sends the document again and may add another charge under the chamber’s current typing budget.")) return;
     typingClickLocked.current = true;
     setTab("editor"); submit.mutate();
 }}>{submit.isPending ? "Starting typing…" : source.ocr_can_retry ? "Try typing again" : "Type this document"}</button>}
 {(connectionPending || submit.isError) && <button className={button} disabled={dirty || repairing || submit.isPending || review.isPending} onClick={() => sourceConnectionPending ? refreshSource() : refreshTypingStatus()}>Refresh typing status</button>}
 {queued && <button className={button} disabled={connectionPending} onClick={refreshTypingStatus}>Refresh typing status</button>}
 <button className={button} aria-pressed={split} onClick={() => setSplit(!split)}>Side by side</button></div></div>
 {finalized && <button className={button} onClick={()=>{setRepairing(true);setTab("editor");}}>Repair reviewed text</button>}
 {connectionPending && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Reconnecting to document status… Keep your edits open. Processing status will update when the connection returns.</p>}
 <p role="status" className="min-h-4 text-xs text-slate-600">{typingResultPending ? "Typing has finished. Loading the saved text for review…" : busy ? (currentOcrStatus === "queued" ? "Waiting for the typing service… Your request is saved; no need to submit again." : "Typing is in progress. Text will appear here for your review.") : typingResultMissing ? "Typing completed without reviewable text. Refresh the document; if it remains empty, contact your chamber administrator before retrying." : source.ocr_status === "failed" ? "Typing needs attention. You can continue manually or use the retry action." : notice ?? (finalized ? "Reviewed text · ready for case summary" : source.pages.some(page => page.reason === "mobile_image_needs_review") ? "Photo document · review the typed text against the original image." : "Scanned document · review the typed text against the original.")}</p>

 <div className={`grid min-w-0 gap-3 ${split ? "md:grid-cols-2" : "grid-cols-1"}`}>
 <section role="tabpanel" aria-label="Original document" className={`${split || tab === "original" ? "block" : "hidden"} document-work-pane min-h-[420px] min-w-0 overflow-hidden rounded-lg border`}>{original}</section>
 <section role="tabpanel" aria-label="Full document text" className={`${split || tab === "editor" ? "flex" : "hidden"} document-work-pane min-h-[420px] min-w-0 flex-col overflow-hidden rounded-lg border bg-white`}><DocxEditor key={`source-editor:${source.editor_version}`} allowExport={false} allowPrint={!busy && !typingResultPending} sourcePageCount={source.page_count} showSourcePageControls={false} initialContent={initial} onSaveContent={save} readOnly={finalized || busy || typingResultPending || submit.isPending || review.isPending} readOnlyMessage={finalized ? "Reviewed text. Use Repair reviewed text to make a new revision." : review.isPending ? "Confirming your review…" : typingResultPending ? "Loading typed text for review…" : "Typing is being prepared. Editing will be available when the text is ready."} onDirtyChange={setDirty}/></section>
 </div>
 {!finalized && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3"><p className="text-sm text-slate-700">Review the complete saved text against the original, then mark the whole document reviewed.</p><button className={`${button} bg-indigo-600 text-white`} disabled={!textReady || dirty || busy || typingResultPending || submit.isPending || review.isPending} onClick={() => { if (reviewClickLocked.current) return; reviewClickLocked.current = true; review.mutate(); }}>{review.isPending ? "Marking reviewed…" : "Mark whole document reviewed"}</button></div>}
 </div>;
}
