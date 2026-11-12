"use client";

import { useEffect, useRef, useState } from "react";
import {
    useExtraction,
    useReviewExtraction,
    useSaveExtractionContent,
} from "@/features/extraction/hooks/useExtraction";

interface ExtractionReviewEditorProps {
    documentId: string;
    onBack: () => void;
}

const AUTOSAVE_DELAY_MS = 2000;

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

export function ExtractionReviewEditor({ documentId, onBack }: ExtractionReviewEditorProps) {
    const { data: extraction, isLoading } = useExtraction(documentId);
    const saveContent = useSaveExtractionContent(documentId);
    const reviewMut = useReviewExtraction(documentId);

    const [content, setContent] = useState("");
    const [saveFlash, setSaveFlash] = useState<"saved" | "error" | null>(null);
    const [actionPending, setActionPending] = useState<"accept" | "edit" | "reject" | null>(null);
    const loadedIdRef = useRef<string | null>(null);
    const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isAccepted = extraction?.review_status === "accepted";

    useEffect(() => {
        if (!extraction || loadedIdRef.current === extraction.id) return;
        setContent(htmlToPlainText(extraction.formatted_content ?? ""));
        loadedIdRef.current = extraction.id;
    }, [extraction]);

    useEffect(() => {
        return () => {
            if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        };
    }, []);

    const scheduleAutosave = (value: string) => {
        setContent(value);
        if (isAccepted || !loadedIdRef.current) return;
        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        autoSaveTimer.current = setTimeout(async () => {
            try {
                await saveContent.mutateAsync(value);
                setSaveFlash("saved");
                setTimeout(() => setSaveFlash(null), 2000);
            } catch {
                setSaveFlash("error");
                setTimeout(() => setSaveFlash(null), 3000);
            }
        }, AUTOSAVE_DELAY_MS);
    };

    const flushAndAction = async (action: "accept" | "edit" | "reject") => {
        if (!extraction) return;
        setActionPending(action);
        if (autoSaveTimer.current) {
            clearTimeout(autoSaveTimer.current);
            autoSaveTimer.current = null;
        }
        try {
            await reviewMut.mutateAsync({
                extractionId: extraction.id,
                extracted_fields: extraction.extracted_fields,
                review_status: action === "accept" ? "accepted" : action === "edit" ? "edited" : "rejected",
                formatted_content: content,
            });
        } finally {
            setActionPending(null);
        }
    };

    const statusBadge = (() => {
        const status = extraction?.review_status;
        if (status === "accepted") return "Accepted";
        if (status === "edited") return "Edited";
        if (status === "rejected") return "Rejected";
        return "Pending review";
    })();

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Loading extraction…
            </div>
        );
    }

    if (!extraction) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">No extraction yet</p>
                <p className="text-xs text-slate-400">Run AI Extraction from the workflow panel first.</p>
                <button type="button" onClick={onBack} className="text-xs text-slate-500 underline hover:text-slate-800">
                    ← Back to steps
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
                <button type="button" onClick={onBack} className="text-xs text-slate-500 transition-colors hover:text-slate-800">
                    ← Back to steps
                </button>
                <div className="flex items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {statusBadge}
                    </span>
                    {saveContent.isPending && <span className="text-[10px] text-slate-400">Saving…</span>}
                    {saveFlash === "saved" && <span className="text-[10px] text-emerald-600">Saved</span>}
                    {saveFlash === "error" && <span className="text-[10px] text-red-500">Save failed</span>}
                </div>
            </div>

            {extraction.confidence_score !== null && extraction.confidence_score !== undefined && (
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-1.5">
                    <span className="text-[10px] text-slate-400">AI confidence:</span>
                    <div className="h-1.5 max-w-[120px] flex-1 overflow-hidden rounded-full bg-slate-200">
                        <div
                            className={`h-full rounded-full transition-all ${
                                extraction.confidence_score >= 0.7 ? "bg-emerald-500" :
                                extraction.confidence_score >= 0.4 ? "bg-amber-400" : "bg-red-400"
                            }`}
                            style={{ width: `${Math.round(extraction.confidence_score * 100)}%` }}
                        />
                    </div>
                    <span className="text-[10px] font-medium text-slate-500">
                        {Math.round(extraction.confidence_score * 100)}%
                    </span>
                </div>
            )}

            <div className="flex-1 overflow-y-auto bg-white p-4">
                <textarea
                    value={content}
                    onChange={(event) => scheduleAutosave(event.target.value)}
                    readOnly={isAccepted}
                    placeholder="Extracted fields will appear here after AI extraction runs."
                    className="min-h-full w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 read-only:bg-slate-50"
                />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] text-slate-400">
                    Review extracted fields as text. Final document formatting is handled separately.
                </p>
                <div className="flex items-center gap-2">
                    {!isAccepted && (
                        <button
                            type="button"
                            onClick={() => void flushAndAction("reject")}
                            disabled={!!actionPending}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                        >
                            {actionPending === "reject" ? "Rejecting…" : "Reject"}
                        </button>
                    )}
                    {!isAccepted && (
                        <button
                            type="button"
                            onClick={() => void flushAndAction("edit")}
                            disabled={!!actionPending}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                        >
                            {actionPending === "edit" ? "Saving…" : "Save Edits"}
                        </button>
                    )}
                    {!isAccepted ? (
                        <button
                            type="button"
                            onClick={() => void flushAndAction("accept")}
                            disabled={!!actionPending}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {actionPending === "accept" ? "Accepting…" : "Accept"}
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => void flushAndAction("edit")}
                            disabled={!!actionPending}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                            {actionPending === "edit" ? "Unlocking…" : "Edit"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
