"use client";
import { CaseActions } from "@/components/cases/CaseActions";

import ReactMarkdown from "react-markdown";
import { CaseNumbersPanel } from "@/components/cases/CaseNumbersPanel";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { SectionsHistoryPanel } from "@/components/cases/SectionsHistoryPanel";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentList } from "@/components/documents/DocumentList";
import { DocxEditor } from "@/features/docx-editor";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import {
    useAddParty,
    useCase,
    useDeleteParty,
} from "@/features/cases/hooks/useCases";
import {
    useCaseContext,
    useCaseSummary,
    useRegenerateSummary,
    useUpdateContextDocument,
} from "@/features/context/hooks/useContext";
import { getContextDocumentIds } from "@/lib/api/context";
import {
    useCourtroomSessions,
    useCreateCourtroomSession,
    useEndCourtroomSession,
} from "@/features/courtroom/hooks/useCourtroom";
import {
    useArchiveDraft,
    useCreateDraft,
    useDraft,
    useDraftList,
    useReviewDraft,
    useUpdateDraft,
} from "@/features/drafts/hooks/useDrafts";
import { useAuthStore } from "@/store/auth.store";
import { type CourtroomSession, type SessionType as CourtroomSessionType, courtroomApi } from "@/lib/api/courtroom";
import { type Draft, type DraftType, DRAFT_TYPE_LABELS } from "@/lib/api/drafts";
import { getAccessToken } from "@/lib/api/client";
import { exportsApi, saveDownloadedFile, type ExportFormat } from "@/lib/api/exports";
import {
    BENCH_TYPE_LABELS,
    CASE_TYPE_LABELS,
    DOCUMENT_TYPE_LABELS,
    Party,
    PARTY_TYPE_LABELS,
    PartyType,
} from "@/types/api";
import { CheckCircle2, Download, FileText, Lock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

type Tab = "overview" | "documents" | "context" | "courtroom";

function getTabFromParam(tab: string | null): Tab | null {
    if (tab === "overview" || tab === "documents") {
        return tab;
    }
    return null;
}

const LEGAL_REVIEW_PAGE = {
    width: "8.5in",
    minHeight: "14in",
    paddingTop: "1.5in",
    paddingRight: "0.5in",
    paddingBottom: "1in",
    paddingLeft: "1.75in",
};

function htmlToPlainText(value: string) {
    if (!/<[a-z][\s\S]*>/i.test(value)) return value;
    return value
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n\n")
        .replace(/<\/h[1-6]>/gi, "\n\n")
        .replace(/<li[^>]*>/gi, "- ")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\u00a0/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function DocumentsTab({ caseId }: { caseId: string }) {
    return (
        <div className="space-y-4 pt-2">
            <DocumentUploader caseId={caseId} />
            <DocumentList caseId={caseId} />
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Draft review panel (SSE streaming + form-based editing)
// ─────────────────────────────────────────────────────────────────────────────

function DraftEditorPanel({ draftId, caseId, onBack }: {
    draftId: string;
    caseId: string;
    onBack: () => void;
}) {
    const [streamText, setStreamText]   = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [savedFlash, setSavedFlash]   = useState(false);
    const [isExporting, setIsExporting] = useState<"pdf" | "docx" | null>(null);
    const [draftText, setDraftText] = useState("");
    const [reviewConfirmation, setReviewConfirmation] = useState({
        draftId: "",
        confirmed: false,
    });
    const streamRef  = useRef("");
    const abortRef   = useRef<AbortController | null>(null);

    const { data: draft, refetch } = useDraft(draftId);
    const updateDraft  = useUpdateDraft(draftId, caseId);
    const reviewDraft  = useReviewDraft(draftId, caseId);
    const archiveDraft = useArchiveDraft(caseId);

    // Start SSE stream when draft status is "generating"
    useEffect(() => {
        if (!draft || draft.status !== "generating") return;
        if (abortRef.current) return; // already streaming

        setIsStreaming(true);
        streamRef.current = "";
        setStreamText("");

        const controller = new AbortController();
        abortRef.current = controller;

        const doStream = async () => {
            try {
                const token = getAccessToken();
                const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
                const headers: Record<string, string> = {};
                if (token) headers["Authorization"] = `Bearer ${token}`;

                const res = await fetch(`${apiBase}/drafts/${draftId}/stream`, {
                    headers,
                    credentials: "include",
                    signal: controller.signal,
                });

                if (!res.ok || !res.body) {
                    setIsStreaming(false);
                    void refetch();
                    return;
                }

                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    // SSE lines end with \n; double \n separates events
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        const data = line.slice(6);
                        if (data === "[DONE]") {
                            reader.cancel();
                            abortRef.current = null;
                            const full = streamRef.current;
                            setDraftText(htmlToPlainText(full));
                            setIsStreaming(false);
                            void refetch();
                            return;
                        }
                        streamRef.current += data;
                        setStreamText(t => t + data);
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") return;
                abortRef.current = null;
                setIsStreaming(false);
                void refetch();
            }
        };

        void doStream();

        return () => {
            controller.abort();
            abortRef.current = null;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [draft?.status, draftId]);

    // Load saved content when not streaming
    useEffect(() => {
        if (isStreaming || !draft?.content) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftText(htmlToPlainText(draft.content));
    }, [draft?.content, isStreaming]);

    const handleSave = async () => {
        await updateDraft.mutateAsync({ content: draftText, status: "editing" });
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2000);
    };

    const handleMarkFinal = async () => {
        const currentDraftReviewed =
            draft?.status === "final" ||
            (reviewConfirmation.draftId === draftId && reviewConfirmation.confirmed);
        if (!currentDraftReviewed) {
            alert("Please confirm lawyer review before marking this draft final.");
            return;
        }
        await reviewDraft.mutateAsync({ content: draftText });
        setReviewConfirmation({ draftId, confirmed: true });
    };

    const handleArchive = async () => {
        if (!confirm("Archive this draft?")) return;
        await archiveDraft.mutateAsync(draftId);
        onBack();
    };

    const handleExport = async (format: "pdf" | "docx") => {
        if (draft?.status !== "final") {
            alert("Lawyer review is required before export.");
            return;
        }
        setIsExporting(format);
        try {
            const token = getAccessToken();
            const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";
            const headers: Record<string, string> = {};
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const res = await fetch(`${apiBase}/drafts/${draftId}/download/${format}`, {
                headers,
                credentials: "include",
            });

            if (!res.ok) throw new Error("Export failed");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(draft?.title ?? "draft").replace(/[^a-z0-9]/gi, "_")}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            void refetch();
        } catch {
            alert("Export failed. Please try again.");
        } finally {
            setIsExporting(null);
        }
    };

    const handleEditorExport = async (content: string, format: ExportFormat) => {
        if (draft?.status !== "final") {
            throw new Error("Confirm lawyer review before exporting this draft.");
        }
        const file = await exportsApi.render({
            title: draft.title,
            file_name: draft.title,
            output_format: format,
            document: JSON.parse(content) as PersistedEditorDocument,
        });
        saveDownloadedFile(file);
    };

    if (!draft) return null;

    const isFinal   = draft.status === "final";
    const isEditing = !isStreaming && !isFinal;
    const reviewConfirmed =
        isFinal ||
        (reviewConfirmation.draftId === draftId && reviewConfirmation.confirmed);

    return (
        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden mt-1 h-[calc(100dvh-5.5rem)]">

            {/* Top bar — compact horizontal row */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 bg-white flex-shrink-0 gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button type="button" onClick={onBack}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors flex-shrink-0">
                        ← Back
                    </button>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate max-w-xs sm:max-w-sm">{draft.title}</p>
                        <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                            {DRAFT_TYPE_LABELS[draft.draft_type]}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">v{draft.version}</span>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isStreaming && (
                        <div className="flex items-center gap-1.5 text-xs text-blue-600">
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
                            Generating…
                        </div>
                    )}
                    {isFinal && (
                        <span className="text-[10px] text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full font-medium">
                            ✓ Final
                        </span>
                    )}
                    {isEditing && (
                        <>
                            <button type="button" onClick={handleSave} disabled={updateDraft.isPending}
                                className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                                {updateDraft.isPending ? "Saving…" : savedFlash ? "✓ Saved" : "Save"}
                            </button>
                            <button type="button" onClick={handleMarkFinal} disabled={reviewDraft.isPending}
                                className="rounded-md bg-purple-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
                                {reviewDraft.isPending ? "Confirming…" : "Confirm Review"}
                            </button>
                        </>
                    )}
                    {!isStreaming && (
                        <>
                            <button type="button"
                                onClick={() => void handleExport("pdf")}
                                disabled={!!isExporting || !isFinal}
                                title={!isFinal ? "Confirm lawyer review before export" : "Download PDF"}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                                {!isFinal ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                                {isExporting === "pdf" ? "PDF…" : "PDF"}
                            </button>
                            <button type="button"
                                onClick={() => void handleExport("docx")}
                                disabled={!!isExporting || !isFinal}
                                title={!isFinal ? "Confirm lawyer review before export" : "Download DOCX"}
                                className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                                {!isFinal ? <Lock className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                                {isExporting === "docx" ? "DOCX…" : "DOCX"}
                            </button>
                        </>
                    )}
                    <button type="button" onClick={handleArchive}
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
                        Archive
                    </button>
                </div>
            </div>

            {!isStreaming && (
                <div className={`shrink-0 flex items-center justify-between border-b px-3 py-1 text-xs ${
                    isFinal
                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-800"
                        : "bg-amber-50/80 border-amber-200 text-amber-800"
                }`}>
                    <div className="flex items-center gap-1.5 truncate">
                        {isFinal ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" /> : <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0" />}
                        <span className="font-medium truncate">
                            {isFinal
                                ? (draft.reviewed_at
                                    ? `Reviewed on ${new Date(draft.reviewed_at).toLocaleDateString("en-IN")}. Legal export unlocked.`
                                    : "Lawyer review verified. Legal export unlocked.")
                                : "Review draft paragraphs before confirming export."}
                        </span>
                    </div>
                    <label className="flex items-center gap-1.5 font-medium shrink-0 cursor-pointer ml-2">
                        <input
                            type="checkbox"
                            checked={reviewConfirmed}
                            disabled={isFinal}
                            onChange={(event) => setReviewConfirmation({
                                draftId,
                                confirmed: event.target.checked,
                            })}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-purple-600"
                        />
                        <span>{isFinal ? "Reviewed & Accepted" : "I reviewed this draft"}</span>
                    </label>
                </div>
            )}

            {/* Content area */}
            <div className={`flex-1 min-h-0 flex flex-col overflow-hidden ${isStreaming ? "overflow-y-auto bg-slate-100 py-8" : ""}`}>
                {isStreaming ? (
                    /* Live streaming view — legal page preview */
                    <div className="mx-auto bg-white shadow-md"
                         style={LEGAL_REVIEW_PAGE}>
                        <pre className="whitespace-pre-wrap [font-family:'Times_New_Roman',Times,serif] text-[13px] leading-[1.8] text-black">
                            {streamText}
                            <span className="inline-block w-0.5 h-4 bg-slate-700 animate-pulse ml-0.5 align-middle" />
                        </pre>
                    </div>
                ) : (
                    /* Docx Editor */
                    <div className="h-full flex-1 overflow-hidden">
                        <DocxEditor
                            key={draftId}
                            draftId={draftId}
                            initialContent={draftText || draft?.content || null}
                            readOnly={isFinal}
                            onSaveContent={async (savedHtml) => {
                                setDraftText(savedHtml);
                                await updateDraft.mutateAsync({ content: savedHtml, status: "editing" });
                            }}
                            onExportDocument={handleEditorExport}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Context document inline editor panel
// ─────────────────────────────────────────────────────────────────────────────

function ContextDocEditorPanel({
    caseId,
    docId,
    docTitle,
    initialContent,
    onBack,
}: {
    caseId:         string;
    docId:          string;
    docTitle:       string;
    initialContent: string;
    onBack:         () => void;
}) {
    const updateCtxDoc = useUpdateContextDocument(caseId);
    const [saveFlash,  setSaveFlash]  = useState<"saved" | "error" | null>(null);
    const [content, setContent] = useState("");
    const autoSaveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Load initial content once
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setContent(htmlToPlainText(initialContent));
    }, [initialContent]);

    const handleSave = async () => {
        if (autoSaveTimer.current) {
            clearTimeout(autoSaveTimer.current);
            autoSaveTimer.current = null;
        }
        try {
            await updateCtxDoc.mutateAsync({ documentId: docId, htmlContent: content });
            setSaveFlash("saved");
            setTimeout(() => setSaveFlash(null), 2000);
        } catch {
            setSaveFlash("error");
            setTimeout(() => setSaveFlash(null), 3000);
        }
    };

    // Clean up timer on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white flex-shrink-0 gap-2">
                <button type="button" onClick={onBack}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors">
                    ← Back to summary
                </button>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600 truncate max-w-[260px]">{docTitle}</span>
                    {updateCtxDoc.isPending && (
                        <span className="text-[10px] text-slate-400">Saving…</span>
                    )}
                    {saveFlash === "saved" && (
                        <span className="text-[10px] text-emerald-500">✓ Context updated</span>
                    )}
                    {saveFlash === "error" && (
                        <span className="text-[10px] text-red-500">Save failed</span>
                    )}
                    <button type="button" onClick={handleSave}
                        disabled={updateCtxDoc.isPending}
                        className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                        {updateCtxDoc.isPending ? "Saving…" : "Save to Context"}
                    </button>
                </div>
            </div>

            {/* Form editor area */}
            <div className="flex-1 overflow-y-auto bg-slate-100 pb-8">
                <div className="relative mx-auto my-4 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.08)]"
                    style={{ width: "8.27in", minHeight: "11.69in", padding: "1in 1in 1in 1.25in" }}>
                    <textarea
                        value={content}
                        onChange={(event) => setContent(event.target.value)}
                        className="min-h-[9.5in] w-full resize-y border-0 bg-transparent [font-family:'Times_New_Roman',Times,serif] text-[12pt] leading-[1.5] text-black outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

// Context & Drafts tab
// ─────────────────────────────────────────────────────────────────────────────

function ContextDraftsTab({ caseId }: { caseId: string }) {
    const [selectedDraftId,      setSelectedDraftId]      = useState<string | null>(null);
    const [selectedContextDocId, setSelectedContextDocId] = useState<string | null>(null);
    const [showNewDraft,         setShowNewDraft]          = useState(false);
    const [newDraftType,         setNewDraftType]          = useState<DraftType>("bail_application");
    const [newDraftInstr,        setNewDraftInstr]         = useState("");

    const { user } = useAuthStore();

    const { data: context, isLoading: ctxLoading }  = useCaseContext(caseId);
    const { data: summary }                          = useCaseSummary(caseId);
    const { data: drafts = [], isLoading: draftsLoading } = useDraftList(caseId);
    const createDraft       = useCreateDraft(caseId);
    const regenerateSummary = useRegenerateSummary(caseId);

    const contextDocumentIds = getContextDocumentIds(context);
    const hasContext         = contextDocumentIds.length > 0;
    const profileComplete    = user?.is_profile_complete ?? false;
    const activeDrafts = drafts.filter((d: Draft) => d.status !== "archived");

    // If a draft is selected, show the full-screen editor
    if (selectedDraftId) {
        return (
            <DraftEditorPanel
                draftId={selectedDraftId}
                caseId={caseId}
                onBack={() => setSelectedDraftId(null)}
            />
        );
    }

    const handleCreate = async () => {
        // createDraft.mutateAsync returns the Draft object directly (already unwrapped)
        const draft = await createDraft.mutateAsync({
            draft_type: newDraftType,
            additional_instructions: newDraftInstr || undefined,
        });
        setSelectedDraftId(draft.id);
        setShowNewDraft(false);
        setNewDraftInstr("");
    };

    return (
        <div className="flex border border-slate-200 rounded-lg overflow-hidden mt-4"
             style={{ height: "calc(100vh - 14rem)" }}>

            {/* ── LEFT: Controls panel ──────────────────────────────────────── */}
            <div className="w-60 flex-shrink-0 border-r border-slate-200 flex flex-col bg-white">

                {/* Advocate info strip */}
                <div className="px-4 pt-4 pb-3 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Advocate
                    </p>
                    {profileComplete ? (
                        <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 space-y-0.5">
                            <p className="text-xs font-semibold text-slate-700">{user?.full_name}</p>
                            {user?.enrollment_number && (
                                <p className="text-[10px] text-slate-500">Enr: {user.enrollment_number}</p>
                            )}
                            {user?.chamber_number && (
                                <p className="text-[10px] text-slate-500">Chamber: {user.chamber_number}</p>
                            )}
                            {user?.court_name && (
                                <p className="text-[10px] text-slate-500 truncate">{user.court_name}</p>
                            )}
                            {user?.mobile_number && (
                                <p className="text-[10px] text-slate-500">Mo: {user.mobile_number}</p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                            <p className="text-[10px] text-amber-700">
                                Profile incomplete.{" "}
                                <Link href="/profile" className="underline font-medium">
                                    Complete profile →
                                </Link>
                            </p>
                        </div>
                    )}
                </div>

                {/* Context status chip */}
                <div className="p-4 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Case Context
                    </p>
                    {ctxLoading ? (
                        <div className="h-8 bg-slate-100 rounded-lg animate-pulse" />
                    ) : hasContext ? (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                <p className="text-xs font-medium text-emerald-700">
                                    {contextDocumentIds.length} doc{contextDocumentIds.length !== 1 ? "s" : ""} in context
                                </p>
                            </div>
                            {(context?.token_estimate ?? 0) > 0 && (
                                <p className="text-[10px] text-emerald-600 mt-0.5 ml-4">
                                    ~{context!.token_estimate!.toLocaleString()} tokens
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                            <p className="text-xs text-amber-700">
                                Approve typed documents in the document workspace before downstream ingestion.
                            </p>
                        </div>
                    )}
                </div>

                {/* Pushed documents list */}
                {hasContext && (() => {
                    const entries = Object.entries(context?.context_json ?? {})
                        .filter(([key]) => key !== "_case" && contextDocumentIds.includes(key));
                    if (entries.length === 0) return null;
                    return (
                        <div className="border-b border-slate-100">
                            <div className="px-4 pt-3 pb-1">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                    Documents in Context
                                </p>
                            </div>
                            <div className="pb-2 space-y-0.5 px-2">
                                {entries.map(([docId, docData]) => {
                                    const d = docData as Record<string, unknown>;
                                    const title = (d.document_title as string | undefined) || (d.document_type as string | undefined) || "Document";
                                    const typeLabel = d.document_type
                                        ? (DOCUMENT_TYPE_LABELS[d.document_type as keyof typeof DOCUMENT_TYPE_LABELS] ?? String(d.document_type))
                                        : "";
                                    const isSelected = selectedContextDocId === docId;
                                    return (
                                        <button key={docId} type="button"
                                            onClick={() => {
                                                setSelectedContextDocId(isSelected ? null : docId);
                                                setShowNewDraft(false);
                                            }}
                                            className={`w-full text-left rounded-lg px-3 py-2 transition-all ${
                                                isSelected
                                                    ? "bg-emerald-50 border border-emerald-200"
                                                    : "hover:bg-slate-50 border border-transparent"
                                            }`}>
                                            <p className="text-xs font-medium text-slate-700 truncate">{title}</p>
                                            {typeLabel && (
                                                <p className="text-[9px] text-slate-400 mt-0.5">{typeLabel}</p>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                {/* Generate New Draft button */}
                <div className="p-4 border-b border-slate-100">
                    <button type="button"
                        onClick={() => { setShowNewDraft(v => !v); setSelectedContextDocId(null); }}
                        disabled={!profileComplete || !hasContext || !summary || !!summary?.is_stale}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        {showNewDraft ? "✕ Cancel" : "+ Generate New Draft"}
                    </button>
                    {!profileComplete && (
                        <p className="text-[10px] text-amber-600 text-center mt-1.5">
                            Complete your{" "}
                            <Link href="/profile" className="underline">profile</Link>
                            {" "}first
                        </p>
                    )}
                    {profileComplete && hasContext && !summary && !regenerateSummary.isPending && (
                        <p className="text-[10px] text-slate-400 text-center mt-1.5">
                            Generate summary first →
                        </p>
                    )}
                    {profileComplete && hasContext && summary?.is_stale && (
                        <p className="text-[10px] text-amber-600 text-center mt-1.5">
                            Refresh summary first
                        </p>
                    )}
                </div>

                {/* Draft list */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-4 pt-3 pb-1">
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                            Drafts {activeDrafts.length > 0 && `(${activeDrafts.length})`}
                        </p>
                    </div>
                    {draftsLoading ? (
                        <div className="p-4 space-y-2">
                            {[1, 2].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
                        </div>
                    ) : activeDrafts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                            <span className="text-3xl mb-2">📝</span>
                            <p className="text-xs text-slate-400">No drafts yet</p>
                        </div>
                    ) : (
                        <div className="p-2 space-y-1">
                            {activeDrafts.map((draft: Draft) => (
                                <div key={draft.id}
                                    onClick={() => setSelectedDraftId(draft.id)}
                                    className="rounded-lg border border-slate-100 hover:border-slate-300 hover:bg-slate-50 px-3 py-2.5 cursor-pointer transition-all">
                                    <p className="text-xs font-medium text-slate-800 truncate">{draft.title}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                                            draft.status === "generating" ? "bg-blue-100 text-blue-700" :
                                            draft.status === "ready"      ? "bg-emerald-100 text-emerald-700" :
                                            draft.status === "editing"    ? "bg-slate-100 text-slate-600" :
                                            draft.status === "final"      ? "bg-purple-100 text-purple-700" :
                                            "bg-slate-100 text-slate-500"
                                        }`}>
                                            {draft.status === "generating" ? "Generating…" :
                                             draft.status === "ready"      ? "Ready" :
                                             draft.status === "editing"    ? "Editing" :
                                             draft.status === "final"      ? "Final" : draft.status}
                                        </span>
                                        <span className="text-[9px] text-slate-400">
                                            {new Date(draft.updated_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short" })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── MAIN: Context doc editor OR Summary + new-draft form ─────── */}
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-slate-50">

                {/* Context document editor */}
                {selectedContextDocId && (() => {
                    const docData = (context?.context_json ?? {})[selectedContextDocId] as Record<string, unknown> | undefined;
                    if (!docData) return null;
                    const title = (docData.document_title as string | undefined) || "Document";
                    const content = (docData.content as string | undefined) ?? "";
                    return (
                        <ContextDocEditorPanel
                            key={selectedContextDocId}
                            caseId={caseId}
                            docId={selectedContextDocId}
                            docTitle={title}
                            initialContent={content}
                            onBack={() => setSelectedContextDocId(null)}
                        />
                    );
                })()}

                {/* New draft form (inline, collapsible) */}
                {!selectedContextDocId && showNewDraft && (
                    <div className="border-b border-slate-200 bg-white px-6 py-5 flex-shrink-0">
                        <p className="text-sm font-semibold text-slate-800 mb-4">Generate New Draft</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 block">Draft Type</label>
                                <select value={newDraftType}
                                    onChange={e => setNewDraftType(e.target.value as DraftType)}
                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400">
                                    {Object.entries(DRAFT_TYPE_LABELS).map(([k, v]) => (
                                        <option key={k} value={k}>{v}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                    Additional Instructions
                                    <span className="text-slate-400 font-normal ml-1">(optional)</span>
                                </label>
                                <input
                                    value={newDraftInstr}
                                    onChange={e => setNewDraftInstr(e.target.value)}
                                    placeholder="e.g. Emphasise medical condition…"
                                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button type="button" onClick={() => setShowNewDraft(false)}
                                className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button type="button" onClick={handleCreate} disabled={createDraft.isPending}
                                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                                {createDraft.isPending ? "Creating…" : "Generate →"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Summary area — hidden when context doc editor is active */}
                {!selectedContextDocId && <div className="flex-1 overflow-y-auto">
                    {/* Summary header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                        <div className="flex items-center gap-3">
                            <h2 className="text-sm font-semibold text-slate-800">AI Case Summary</h2>
                            {summary && !summary.is_stale && (
                                <span className="text-[10px] text-slate-400">
                                    {new Date(summary.generated_at).toLocaleDateString("en-IN", {
                                        day: "2-digit", month: "short", year: "numeric",
                                    })}
                                </span>
                            )}
                            {summary?.is_stale && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                                    ⚠ Outdated
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {regenerateSummary.isPending && (
                                <div className="flex items-center gap-1.5 text-xs text-indigo-600">
                                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
                                    Generating…
                                </div>
                            )}
                            {hasContext && !summary && !regenerateSummary.isPending && (
                                <button type="button"
                                    onClick={() => regenerateSummary.mutate()}
                                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors">
                                    Generate Summary
                                </button>
                            )}
                            {summary && (
                                <button type="button"
                                    onClick={() => regenerateSummary.mutate()}
                                    disabled={regenerateSummary.isPending}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                                    ↺ Refresh
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Case Details (auto-synced from case data) */}
                    {(() => {
                        const caseCtx = context?.context_json?.["_case"] as Record<string, unknown> | undefined;
                        if (!caseCtx) return null;
                        return (
                            <div className="px-6 py-4 border-b border-slate-200 bg-white">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-3">
                                    Case Details <span className="normal-case font-normal text-slate-300">· auto-synced</span>
                                </p>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                                    {Boolean(caseCtx.title) && (
                                        <div className="col-span-2">
                                            <span className="text-slate-400">Title: </span>
                                            <span className="font-medium text-slate-700">{String(caseCtx.title)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.petitioner) && (
                                        <div>
                                            <span className="text-slate-400">Petitioner: </span>
                                            <span className="text-slate-700">{String(caseCtx.petitioner)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.respondent) && (
                                        <div>
                                            <span className="text-slate-400">Respondent: </span>
                                            <span className="text-slate-700">{String(caseCtx.respondent)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.type) && (
                                        <div>
                                            <span className="text-slate-400">Type: </span>
                                            <span className="text-slate-700">{String(caseCtx.type)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.bench) && (
                                        <div>
                                            <span className="text-slate-400">Bench: </span>
                                            <span className="text-slate-700">{String(caseCtx.bench)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.stage) && (
                                        <div>
                                            <span className="text-slate-400">Stage: </span>
                                            <span className="text-slate-700">{String(caseCtx.stage)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.status) && (
                                        <div>
                                            <span className="text-slate-400">Status: </span>
                                            <span className="text-slate-700">{String(caseCtx.status)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.act) && (
                                        <div>
                                            <span className="text-slate-400">Act: </span>
                                            <span className="text-slate-700">{String(caseCtx.act)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.court_number) && (
                                        <div>
                                            <span className="text-slate-400">Court No.: </span>
                                            <span className="text-slate-700">{String(caseCtx.court_number)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.filing_date) && (
                                        <div>
                                            <span className="text-slate-400">Filing: </span>
                                            <span className="text-slate-700">{String(caseCtx.filing_date)}</span>
                                        </div>
                                    )}
                                    {Boolean(caseCtx.next_hearing_date) && (
                                        <div>
                                            <span className="text-slate-400">Next Hearing: </span>
                                            <span className="text-slate-700">{String(caseCtx.next_hearing_date)}</span>
                                        </div>
                                    )}
                                </div>
                                {/* Case numbers */}
                                {Array.isArray(caseCtx.case_numbers) && (caseCtx.case_numbers as unknown[]).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">Case Numbers</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(caseCtx.case_numbers as Array<Record<string, unknown>>).map((n, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                                    <span className="text-slate-400">{String(n.type)}:</span> {String(n.number)}{n.year ? ` / ${n.year}` : ""}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Sections */}
                                {Array.isArray(caseCtx.sections) && (caseCtx.sections as unknown[]).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">Sections</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(caseCtx.sections as Array<Record<string, unknown>>).map((s, i) => (
                                                <span key={i} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700 border border-indigo-100">
                                                    {String(s.act)} § {String(s.section)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Parties */}
                                {Array.isArray(caseCtx.parties) && (caseCtx.parties as unknown[]).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">Parties</p>
                                        <div className="space-y-1">
                                            {(caseCtx.parties as Array<Record<string, unknown>>).map((p, i) => (
                                                <div key={i} className="text-[10px] text-slate-600">
                                                    <span className={`font-medium ${p.type === "petitioner" ? "text-blue-600" : p.type === "respondent" ? "text-red-600" : "text-slate-600"}`}>
                                                        [{String(p.type)}]
                                                    </span>{" "}
                                                    {String(p.name)}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {/* Brief facts */}
                                {Boolean(caseCtx.brief_facts) && (
                                    <div className="mt-2 pt-2 border-t border-slate-100">
                                        <p className="text-[10px] text-slate-400 mb-1">Brief Facts</p>
                                        <p className="text-[10px] text-slate-600 leading-relaxed line-clamp-3">{String(caseCtx.brief_facts)}</p>
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Summary body */}
                    <div className="px-6 py-5">
                        {!hasContext && !ctxLoading && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <span className="text-5xl mb-4">📂</span>
                                <p className="text-sm font-medium text-slate-600">No documents in context</p>
                                <p className="text-xs text-slate-400 mt-1">
                                    Go to the <strong>Documents</strong> tab, open a document, and approve its typed revision.
                                </p>
                            </div>
                        )}

                        {hasContext && !summary && !regenerateSummary.isPending && (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <span className="text-5xl mb-4">✨</span>
                                <p className="text-sm font-medium text-slate-600">Ready to generate</p>
                                <p className="text-xs text-slate-400 mt-1 mb-4">
                                    {contextDocumentIds.length} document{contextDocumentIds.length !== 1 ? "s" : ""} in context. Generate a summary to unlock draft creation.
                                </p>
                                <button type="button"
                                    onClick={() => regenerateSummary.mutate()}
                                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors">
                                    Generate Case Summary
                                </button>
                            </div>
                        )}

                        {summary?.is_stale && (
                            <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                                <span className="text-amber-500 text-base mt-0.5">⚠</span>
                                <div>
                                    <p className="text-sm font-medium text-amber-800">Summary is outdated</p>
                                    <p className="text-xs text-amber-700 mt-0.5">
                                        Context was updated since this summary was generated. Click <strong>Refresh</strong> before generating a new draft.
                                    </p>
                                </div>
                            </div>
                        )}

                        {summary && (
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => <h1 className="text-base font-bold text-slate-800 mt-5 mb-2 first:mt-0">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-sm font-semibold text-slate-800 mt-5 mb-2 first:mt-0">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4 mb-1.5 first:mt-0">{children}</h3>,
                                    p:  ({ children }) => <p  className="text-sm text-slate-700 leading-relaxed mb-3">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-slate-800">{children}</strong>,
                                    em: ({ children }) => <em className="italic text-slate-600">{children}</em>,
                                    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="text-sm text-slate-700 leading-relaxed">{children}</li>,
                                    hr: () => <hr className="my-4 border-slate-200" />,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-slate-300 pl-4 my-3 text-slate-600 italic">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {summary.summary_text}
                            </ReactMarkdown>
                        )}
                    </div>
                </div>}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Courtroom chat interface
// ─────────────────────────────────────────────────────────────────────────────

function ChatInterface({ session, caseId, onBack }: {
    session: CourtroomSession;
    caseId: string;
    onBack: () => void;
}) {
    const [input, setInput]             = useState("");
    const [sending, setSending]         = useState(false);
    const [streamingText, setStreaming] = useState("");
    const [localMessages, setLocalMsgs] = useState(session.messages);
    const bottomRef = useRef<HTMLDivElement>(null);
    const endSession = useEndCourtroomSession(caseId, session.id);

    // Sync local messages when session prop updates
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalMsgs(session.messages);
    }, [session.messages]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [localMessages, streamingText]);

    // Ref to capture streamingText at the moment onComplete fires (avoids stale closure)
    const streamingRef = useRef("");
    useEffect(() => { streamingRef.current = streamingText; }, [streamingText]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || sending) return;
        setInput("");
        setSending(true);

        const userMsg = { role: "lawyer" as const, content: text, timestamp: new Date().toISOString() };
        setLocalMsgs(prev => [...prev, userMsg]);
        setStreaming("");
        streamingRef.current = "";

        await courtroomApi.streamMessage(
            session.id,
            text,
            (chunk) => {
                streamingRef.current += chunk;
                setStreaming(prev => prev + chunk);
            },
            () => {
                const aiContent = streamingRef.current;
                setLocalMsgs(prev => [
                    ...prev,
                    { role: "ai", content: aiContent, timestamp: new Date().toISOString() },
                ]);
                setStreaming("");
                streamingRef.current = "";
                setSending(false);
            },
            () => {
                setSending(false);
                setStreaming("");
                streamingRef.current = "";
            },
        );
    };

    const isJudge = session.session_type === "judge";
    const isEnded = session.status !== "active";

    return (
        <div className="flex flex-col border border-slate-200 rounded-lg overflow-hidden mt-4"
             style={{ height: "calc(100vh - 14rem)" }}>

            {/* Top bar */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={onBack}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors">
                        ← Back
                    </button>
                    <div>
                        <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">
                            {session.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                isJudge
                                    ? "bg-indigo-100 text-indigo-700"
                                    : "bg-rose-100 text-rose-700"
                            }`}>
                                {isJudge ? "⚖️ Judge Mode" : "⚔️ Opposing Counsel"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                                {session.turn_count} turns
                            </span>
                            {isEnded && (
                                <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full">
                                    Completed
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {!isEnded && (
                    <button type="button"
                        onClick={() => endSession.mutate()}
                        disabled={endSession.isPending}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50">
                        {endSession.isPending ? "Ending…" : "End Session"}
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {localMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                        <span className="text-4xl mb-3">{isJudge ? "⚖️" : "⚔️"}</span>
                        <p className="text-sm font-medium text-slate-700">
                            {isJudge ? "The judge is ready." : "Opposing counsel is ready."}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                            {isJudge
                                ? "Present your arguments. The judge will ask probing questions."
                                : "Make your submissions. Opposing counsel will challenge them."}
                        </p>
                    </div>
                )}

                {localMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "lawyer" ? "justify-end" : "justify-start"}`}>
                        {msg.role === "ai" && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5 bg-white border border-slate-200 shadow-sm">
                                {isJudge ? "⚖️" : "⚔️"}
                            </div>
                        )}
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                            msg.role === "lawyer"
                                ? "bg-indigo-600 text-white rounded-tr-sm"
                                : "bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm"
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                            <p className={`text-[10px] mt-1 ${
                                msg.role === "lawyer" ? "text-slate-400" : "text-slate-400"
                            }`}>
                                {new Date(msg.timestamp).toLocaleTimeString("en-IN", {
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Streaming AI response */}
                {streamingText && (
                    <div className="flex justify-start">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5 bg-white border border-slate-200 shadow-sm">
                            {isJudge ? "⚖️" : "⚔️"}
                        </div>
                        <div className="max-w-[75%] rounded-2xl rounded-tl-sm px-4 py-2.5 bg-white border border-slate-200 shadow-sm text-sm text-slate-800 leading-relaxed">
                            <p className="whitespace-pre-wrap">{streamingText}
                                <span className="inline-block w-0.5 h-3.5 bg-slate-600 animate-pulse ml-0.5 align-middle" />
                            </p>
                        </div>
                    </div>
                )}

                {/* Typing indicator (when sending but no stream yet) */}
                {sending && !streamingText && (
                    <div className="flex justify-start">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5 bg-white border border-slate-200 shadow-sm">
                            {isJudge ? "⚖️" : "⚔️"}
                        </div>
                        <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white border border-slate-200 shadow-sm">
                            <div className="flex gap-1 items-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Weak points after session ends */}
            {isEnded && session.weak_points_identified.length > 0 && (
                <div className="flex-shrink-0 border-t border-slate-200 bg-amber-50 p-4 max-h-40 overflow-y-auto">
                    <p className="text-xs font-semibold text-amber-800 mb-2">
                        ⚠ Weak Points Identified ({session.weak_points_identified.length})
                    </p>
                    <div className="space-y-2">
                        {session.weak_points_identified.map((wp, i) => (
                            <div key={i} className="text-xs">
                                <span className="font-medium text-amber-800">{wp.point}</span>
                                {wp.suggestion && (
                                    <span className="text-amber-600"> — {wp.suggestion}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Input area */}
            {!isEnded && (
                <div className="flex-shrink-0 border-t border-slate-200 bg-white p-3">
                    <div className="flex items-end gap-2">
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void handleSend();
                                }
                            }}
                            placeholder="Type your argument… (Enter to send, Shift+Enter for new line)"
                            rows={2}
                            disabled={sending}
                            className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-slate-400 resize-none disabled:opacity-50"
                        />
                        <button type="button" onClick={() => void handleSend()}
                            disabled={sending || !input.trim()}
                            className="flex-shrink-0 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                            {sending ? "…" : "Send →"}
                        </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1.5 text-right">Enter to send · Shift+Enter for new line</p>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Courtroom tab
// ─────────────────────────────────────────────────────────────────────────────

const SESSION_TYPE_META: Record<CourtroomSessionType, { label: string; icon: string; desc: string; color: string }> = {
    opposing_counsel: {
        label: "Opposing Counsel",
        icon: "⚔️",
        desc: "An aggressive opposing lawyer will challenge every argument you make.",
        color: "rose",
    },
    judge: {
        label: "Judge",
        icon: "⚖️",
        desc: "A sharp judge will probe your submissions with hard questions.",
        color: "indigo",
    },
};

function CourtroomTab({ caseId }: { caseId: string }) {
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [showNew,           setShowNew]           = useState(false);
    const [sessionType,       setSessionType]       = useState<CourtroomSessionType>("opposing_counsel");

    const { data: sessions = [], isLoading } = useCourtroomSessions(caseId);
    const createSession = useCreateCourtroomSession(caseId);

    const activeSessions   = sessions.filter(s => s.status === "active");
    const completedSessions = sessions.filter(s => s.status !== "active");

    const selectedSession = sessions.find(s => s.id === selectedSessionId);

    if (selectedSession) {
        return (
            <ChatInterface
                session={selectedSession}
                caseId={caseId}
                onBack={() => setSelectedSessionId(null)}
            />
        );
    }

    const handleCreate = async () => {
        const meta = SESSION_TYPE_META[sessionType];
        const res = await createSession.mutateAsync({
            session_type: sessionType,
            title: `Practice with ${meta.label}`,
        });
        setSelectedSessionId(res.id);
        setShowNew(false);
    };

    return (
        <div className="space-y-5 pt-2 max-w-3xl">

            {/* Intro card */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="flex items-start gap-4">
                    <span className="text-3xl flex-shrink-0">⚖️</span>
                    <div>
                        <h2 className="text-sm font-semibold text-slate-800">Courtroom Practice</h2>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Sharpen your arguments before the real hearing. Practice with an AI playing the role of an
                            aggressive opposing counsel or a strict judge. After each session, get a detailed analysis
                            of weak points in your submissions.
                        </p>
                    </div>
                </div>
            </div>

            {/* New session picker */}
            {!showNew ? (
                <button type="button" onClick={() => setShowNew(true)}
                    className="w-full rounded-lg border-2 border-dashed border-slate-200 hover:border-slate-400 p-4 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-2">
                    <span>+</span> Start New Practice Session
                </button>
            ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-slate-800">Choose Practice Mode</p>
                        <button type="button" onClick={() => setShowNew(false)}
                            className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {(Object.entries(SESSION_TYPE_META) as [CourtroomSessionType, typeof SESSION_TYPE_META[CourtroomSessionType]][]).map(([type, meta]) => (
                            <button key={type} type="button" onClick={() => setSessionType(type)}
                                className={`rounded-lg border-2 p-4 text-left transition-all ${
                                    sessionType === type
                                        ? type === "judge"
                                            ? "border-indigo-500 bg-indigo-50"
                                            : "border-rose-500 bg-rose-50"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                }`}>
                                <span className="text-2xl block mb-2">{meta.icon}</span>
                                <p className={`text-xs font-semibold mb-1 ${
                                    sessionType === type
                                        ? type === "judge" ? "text-indigo-800" : "text-rose-800"
                                        : "text-slate-700"
                                }`}>
                                    {meta.label}
                                </p>
                                <p className="text-[11px] text-slate-500 leading-relaxed">{meta.desc}</p>
                            </button>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowNew(false)}
                            className="px-4 py-2 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">
                            Cancel
                        </button>
                        <button type="button" onClick={handleCreate} disabled={createSession.isPending}
                            className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            {createSession.isPending ? "Starting…" : "Start Session →"}
                        </button>
                    </div>
                </div>
            )}

            {/* Active sessions */}
            {isLoading && (
                <div className="space-y-2">
                    {[1, 2].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}
                </div>
            )}

            {activeSessions.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Active Sessions
                    </p>
                    <div className="space-y-2">
                        {activeSessions.map(s => (
                            <SessionCard key={s.id} session={s} onClick={() => setSelectedSessionId(s.id)} />
                        ))}
                    </div>
                </div>
            )}

            {/* Past sessions */}
            {completedSessions.length > 0 && (
                <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Past Sessions
                    </p>
                    <div className="space-y-2">
                        {completedSessions.map(s => (
                            <SessionCard key={s.id} session={s} onClick={() => setSelectedSessionId(s.id)} />
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && sessions.length === 0 && !showNew && (
                <p className="text-sm text-slate-400 text-center py-8">
                    No sessions yet. Start a practice session above.
                </p>
            )}
        </div>
    );
}

function SessionCard({ session, onClick }: { session: CourtroomSession; onClick: () => void }) {
    const meta    = SESSION_TYPE_META[session.session_type];
    const isActive = session.status === "active";
    return (
        <div onClick={onClick}
            className="flex items-center justify-between bg-white rounded-lg border border-slate-100 hover:border-slate-300 hover:shadow-sm px-4 py-3.5 cursor-pointer transition-all">
            <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl flex-shrink-0">{meta.icon}</span>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{session.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">{session.turn_count} turns</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-[10px] text-slate-400">
                            {new Date(session.updated_at).toLocaleDateString("en-IN", {
                                day: "2-digit", month: "short",
                            })}
                        </span>
                        {session.weak_points_identified.length > 0 && (
                            <>
                                <span className="text-slate-200">·</span>
                                <span className="text-[10px] text-amber-600">
                                    {session.weak_points_identified.length} weak points
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}>
                {isActive ? "Active" : "Completed"}
            </span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function CaseDetailPage() {
    const params   = useParams();
    const searchParams = useSearchParams();
    const caseId   = params.id as string;
    const activeTab = getTabFromParam(searchParams.get("tab")) ?? "overview";

    const { data, isLoading, isError } = useCase(caseId);
    const addParty    = useAddParty(caseId);
    const deleteParty = useDeleteParty(caseId);

    if (isLoading) {
        return (
            <WorkspacePage variant="wide" className="animate-pulse space-y-4">
                <div className="h-8 bg-slate-100 rounded-lg w-64" />
                <div className="h-48 bg-slate-100 rounded-lg" />
            </WorkspacePage>
        );
    }

    if (isError || !data) {
        return (
            <div className="mx-4 my-5 rounded-lg bg-red-50 border border-red-200 p-6 text-sm text-red-700 sm:mx-6 lg:mx-8">
                Case not found.{" "}
                <Link href="/cases" className="underline">Back to cases</Link>
            </div>
        );
    }

    const c   = data;
    const lbl = "text-xs font-medium text-slate-500 uppercase tracking-wide";
    const val = "text-sm text-slate-900 mt-0.5";


    return (
        <WorkspacePage variant="wide" className="py-1.5">
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 max-w-full flex-1 items-center gap-2">
                    <h1 className="truncate text-lg font-semibold leading-tight text-slate-900">{c.case_title}</h1>
                    <CaseStatusBadge status={c.status} stage={c.stage} />
                </div>

                <CaseActions item={c} onDetail />
            </div>

            {/* Tab content */}

            {activeTab === "overview" && (
                <div className="mt-4 grid gap-5 lg:grid-cols-3">
                    <div className="space-y-5 lg:col-span-2">
                        <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <h2 className="text-sm font-semibold text-slate-800 mb-4">Case Details</h2>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                <div><p className={lbl}>Type</p><p className={val}>{CASE_TYPE_LABELS[c.case_type]}</p></div>
                                <div><p className={lbl}>Bench</p><p className={val}>{BENCH_TYPE_LABELS[c.bench_type]}</p></div>
                                <div><p className={lbl}>Petitioner</p><p className={val}>{c.petitioner_name}</p></div>
                                <div><p className={lbl}>Respondent</p><p className={val}>{c.respondent_name}</p></div>
                                {c.act_name       && <div><p className={lbl}>Act</p><p className={val}>{c.act_name}</p></div>}
                                {c.court_number   && <div><p className={lbl}>Court No.</p><p className={val}>{c.court_number}</p></div>}
                                {c.filing_date    && <div><p className={lbl}>Filing Date</p><p className={val}>{new Date(c.filing_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p></div>}
                                {c.next_hearing_date && <div><p className={lbl}>Next Hearing</p><p className={`${val} font-medium`}>{new Date(c.next_hearing_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p></div>}
                                {c.bail_rejection_date && <div><p className={lbl}>Bail Rejection</p><p className={val}>{new Date(c.bail_rejection_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p></div>}
                                {c.limitation_expiry_date && <div><p className={lbl}>Limitation Expiry</p><p className={`${val} text-orange-600 font-medium`}>{new Date(c.limitation_expiry_date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</p></div>}
                            </div>
                            {c.brief_facts && (
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <p className={lbl}>Brief Facts</p>
                                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">{c.brief_facts}</p>
                                </div>
                            )}
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-sm font-semibold text-slate-800">Parties</h2>
                                <button type="button" onClick={() => {
                                    const name = window.prompt("Party name?");
                                    if (!name?.trim()) return;
                                    const type = window.prompt("Party type? (petitioner/respondent/intervener/witness/other)", "respondent");
                                    addParty.mutate({ name, party_type: (type as PartyType) || "other" });
                                }} className="text-xs font-medium text-slate-800 hover:text-slate-600">+ Add</button>
                            </div>
                            {c.parties.length === 0
                                ? <p className="text-xs text-slate-400">No parties added yet.</p>
                                : <div className="divide-y divide-slate-50">
                                    {c.parties.map((p: Party) => (
                                        <div key={p.id} className="flex items-center justify-between py-2.5">
                                            <div>
                                                <p className="text-sm font-medium text-slate-800">{p.name}</p>
                                                <p className="text-xs text-slate-500">{PARTY_TYPE_LABELS[p.party_type]}</p>
                                                {p.phone && <p className="text-xs text-slate-400">{p.phone}</p>}
                                            </div>
                                            <button onClick={() => deleteParty.mutate(p.id)}
                                                className="text-xs text-slate-300 hover:text-red-500 transition-colors">✕</button>
                                        </div>
                                    ))}
                                </div>
                            }
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <CaseNumbersPanel caseId={caseId} caseNumbers={c.case_numbers} canEdit={true} />
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-4">
                            <SectionsHistoryPanel caseId={caseId} activeSections={c.sections.filter(s => s.is_active)} canEdit={true} />
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "documents" && (
                <DocumentsTab
                    caseId={caseId}
                />
            )}

            {activeTab === "context" && <ContextDraftsTab caseId={caseId} />}

            {activeTab === "courtroom" && <CourtroomTab caseId={caseId} />}

        </WorkspacePage>
    );
}
