"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";
import { summariesApi, type SummaryRunDetail } from "@/lib/api/summaries";
import { summaryRunFailureMessage } from "./summary-errors";
import { StructuredSummaryView } from "./StructuredSummaryView";
import { SummaryWordEditor, type ReviewBlock } from "./SummaryWordEditor";

type ViewMode = "word" | "evidence" | "split";

export function SummaryReviewWorkspace(props: { caseId: string; runId: string }) {
    const generation = useAuthStore((s) => s.generation);
    const chamberId = useChamberStore((s) => s.selected?.id);
    return (
        <ScopedReview
            key={`${generation}:${chamberId}:${props.caseId}:${props.runId}`}
            {...props}
        />
    );
}

function ScopedReview({ caseId, runId }: { caseId: string; runId: string }) {
    const generation = useAuthStore((s) => s.generation);
    const chamberId = useChamberStore((s) => s.selected?.id);
    const client = useQueryClient();
    const key = ["summary-run", caseId, runId, generation, chamberId];
    const run = useQuery({
        queryKey: key,
        queryFn: () => summariesApi.getRun(caseId, runId),
        refetchOnWindowFocus: false,
    });
    const [viewMode, setViewMode] = useState<ViewMode>("word");
    const [dirty, setDirty] = useState(false);
    const [comment, setComment] = useState("");
    const [showChangesModal, setShowChangesModal] = useState(false);
    const [saved, setSaved] = useState(false);
    const [recoveryReviewed, setRecoveryReviewed] = useState(false);
    const [showAuditTrail, setShowAuditTrail] = useState(false);

    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (dirty) event.preventDefault();
        };
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const update = async (data: SummaryRunDetail) => {
        client.setQueryData(key, data);
        await client.invalidateQueries({ queryKey: ["summary-runs", caseId] });
    };

    const save = useMutation({
        mutationFn: async (editorState: Record<string, unknown>) => {
            if (!run.data?.result_hash) throw new Error("Reload the summary before saving.");
            return summariesApi.saveEditor(caseId, runId, {
                expected_review_version: run.data.review_version,
                expected_result_hash: run.data.result_hash,
                editor_state: JSON.parse(JSON.stringify(editorState)),
            });
        },
        onSuccess: async (data) => {
            setDirty(false);
            setSaved(true);
            await update(data);
        },
    });

    const decide = useMutation({
        mutationFn: async (action: "approve" | "request_changes") => {
            if (!run.data?.result_hash || dirty)
                throw new Error("Save your changes before approving.");
            return summariesApi.decideReview(caseId, runId, {
                action,
                expected_result_hash: run.data.result_hash,
                expected_review_version: run.data.review_version,
                acknowledge_incomplete: recoveryReviewed,
                ...(comment.trim() ? { comment: comment.trim() } : {}),
            });
        },
        onSuccess: (data) => {
            setShowChangesModal(false);
            void update(data);
        },
    });

    const data = run.data;
    const pending = save.isPending || decide.isPending;
    const approved = data?.status === "completed";
    const reviewable = data?.status === "pending_review";
    const blocks: ReviewBlock[] = data?.editor_blocks ?? [];
    const unverified =
        data?.result_payload &&
        "schema_version" in data.result_payload &&
        data.result_payload.schema_version === "case-summary-unverified-v1";

    if (run.isPending) {
        return (
            <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center text-sm text-slate-500">
                <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                Loading case summary…
            </div>
        );
    }

    if (run.error || !data) {
        return (
            <div className="p-6 max-w-lg mx-auto">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    {run.error ? run.error.message : "Unable to load summary."}
                </div>
                <Link
                    href={`/cases/${caseId}/summary`}
                    className="mt-3 inline-block text-xs font-semibold text-indigo-600 underline"
                >
                    ← Back to summary runs
                </Link>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100dvh-3.5rem)] min-w-0 flex-col overflow-hidden bg-slate-100">
            {/* Slim, Compact Horizontal Action & Navigation Bar */}
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5 text-xs z-20 shadow-2xs">
                {/* Left: Navigation, Title, Status & View Mode Switcher */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <Link
                        className="font-medium text-slate-500 hover:text-slate-800 transition inline-flex items-center gap-1 shrink-0"
                        href={`/cases/${caseId}/summary`}
                        title="Back to Case Summary Runs"
                    >
                        ← Back
                    </Link>

                    <div className="h-4 w-px bg-slate-200 shrink-0" />

                    <span className="font-bold text-slate-900 truncate shrink-0">
                        Case Summary
                    </span>

                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            approved
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                        }`}
                    >
                        {approved ? "✓ Approved" : data.status.replaceAll("_", " ")}
                    </span>

                    <div className="h-4 w-px bg-slate-200 shrink-0 hidden sm:block" />

                    {/* View Switcher Pills */}
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md shrink-0" role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === "word"}
                            onClick={() => setViewMode("word")}
                            className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                viewMode === "word"
                                    ? "bg-white text-indigo-700 shadow-2xs"
                                    : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                            📄 Word (DOCX)
                        </button>
                        {data.presentation && (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={viewMode === "evidence"}
                                onClick={() => setViewMode("evidence")}
                                className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                    viewMode === "evidence"
                                        ? "bg-white text-indigo-700 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                🔍 Evidence
                            </button>
                        )}
                        {data.presentation && (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={viewMode === "split"}
                                onClick={() => setViewMode("split")}
                                className={`hidden lg:inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                    viewMode === "split"
                                        ? "bg-white text-indigo-700 shadow-2xs"
                                        : "text-slate-600 hover:text-slate-900"
                                }`}
                            >
                                ◫ Split
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {/* Unsaved / Saved indicator */}
                    <span className="text-[11px] font-medium text-slate-500 hidden md:inline">
                        {dirty ? (
                            <span className="text-amber-600 font-semibold">● Unsaved edits</span>
                        ) : saved || data.has_saved_edits ? (
                            <span className="text-emerald-600">✓ Saved</span>
                        ) : null}
                    </span>

                    {/* Cited documents popup badge */}
                    <details className="relative">
                        <summary className="cursor-pointer text-[11px] font-medium text-slate-600 hover:text-slate-900 list-none inline-flex items-center gap-1 border border-slate-200 rounded-md px-2 py-1 bg-slate-50">
                            📁 {data.source_count} Doc{data.source_count === 1 ? "" : "s"}
                            <span className="text-[9px] text-slate-400">▼</span>
                        </summary>
                        <div className="absolute right-0 mt-1 z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Original Documents Cited:</p>
                            <ul className="space-y-1.5 max-h-48 overflow-y-auto">
                                {data.review_documents?.map((doc) => (
                                    <li key={doc.document_id}>
                                        <Link
                                            className="block truncate text-xs text-indigo-700 hover:underline"
                                            href={`/cases/${caseId}/documents/${doc.document_id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title={doc.filename}
                                        >
                                            📄 {doc.filename}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </details>

                    {/* Reviewable Actions */}
                    {reviewable && (
                        <>

                            <button
                                type="button"
                                disabled={
                                    pending ||
                                    dirty ||
                                    !blocks.length ||
                                    Boolean(unverified) ||
                                    Boolean(data.editor_recovery_notice && !recoveryReviewed)
                                }
                                onClick={() => decide.mutate("approve")}
                                className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition"
                                title={dirty ? "Save changes before approving" : "Approve summary"}
                            >
                                {decide.isPending ? "Approving…" : "✓ Approve"}
                            </button>

                            <button
                                type="button"
                                onClick={() => setShowChangesModal(true)}
                                className="inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100 transition"
                                title="Request changes from AI"
                            >
                                Request Changes
                            </button>
                        </>
                    )}

                    {/* Approved Action */}
                    {approved && (
                        <Link
                            href={`/cases/${caseId}/drafts/new/${runId}`}
                            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs hover:bg-indigo-700 transition"
                        >
                            <span>⚡ Generate Draft</span>
                            <span>→</span>
                        </Link>
                    )}
                </div>
            </header>

            {/* Incomplete / Recovery Notice Banner (only when needed) */}
            {data.editor_recovery_notice && (
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                    <div className="flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{data.editor_recovery_notice}</span>
                    </div>
                    {reviewable && (
                        <label className="flex items-center gap-1.5 font-medium shrink-0 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={recoveryReviewed}
                                disabled={pending || dirty}
                                onChange={(e) => setRecoveryReviewed(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-amber-300 text-indigo-600"
                            />
                            I completed missing info
                        </label>
                    )}
                </div>
            )}

            {/* Error notifications */}
            {(save.error || decide.error || data.error_code) && (
                <div className="flex shrink-0 items-center justify-between border-b border-red-200 bg-red-50 px-3 py-1 text-xs text-red-800">
                    <span>
                        {(save.error ?? decide.error)?.message ??
                            (data.error_code ? summaryRunFailureMessage(data.error_code) : "")}
                    </span>
                </div>
            )}

            {/* Main Editor Viewport — 100% Height, Fixed Viewport, Zero Page Scroll */}
            <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-white">
                {viewMode === "split" && data.presentation ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 h-full min-h-0 p-2 overflow-hidden bg-slate-100">
                        <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white">
                            <div className="bg-slate-50 px-3 py-1 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide shrink-0">
                                Word Document (Editable DOCX)
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                {blocks.length > 0 ? (
                                    <SummaryWordEditor
                                        key={`word-split:${runId}:${data.review_version}`}
                                        blocks={blocks}
                                        readOnly={!reviewable || pending}
                                        onDirtyChange={(isDirty) => {
                                            setDirty(isDirty);
                                            if (isDirty) {
                                                setSaved(false);
                                                setRecoveryReviewed(false);
                                            }
                                        }}
                                        onSave={async (updatedState) => {
                                            await save.mutateAsync(updatedState);
                                        }}
                                    />
                                ) : (
                                    <div className="p-4 text-xs text-slate-500">No editable summary text.</div>
                                )}
                            </div>
                        </div>

                        <div className="h-full min-h-0 flex flex-col overflow-hidden rounded-lg border border-slate-300 bg-white">
                            <div className="bg-slate-50 px-3 py-1 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wide shrink-0">
                                Interactive Evidence & Citations
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto p-4">
                                <StructuredSummaryView view={data.presentation} caseId={caseId} runId={runId} />
                            </div>
                        </div>
                    </div>
                ) : viewMode === "evidence" && data.presentation ? (
                    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-slate-50">
                        <div className="max-w-5xl mx-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
                            <StructuredSummaryView view={data.presentation} caseId={caseId} runId={runId} />
                        </div>
                    </div>
                ) : (
                    /* Default: Word Editor (DOCX) View — Full Viewport */
                    <div className="flex-1 min-h-0 h-full w-full overflow-hidden flex flex-col">
                        {blocks.length > 0 ? (
                            <SummaryWordEditor
                                key={`word-full:${runId}:${data.review_version}`}
                                blocks={blocks}
                                readOnly={!reviewable || pending}
                                onDirtyChange={(isDirty) => {
                                    setDirty(isDirty);
                                    if (isDirty) {
                                        setSaved(false);
                                        setRecoveryReviewed(false);
                                    }
                                }}
                                onSave={async (updatedState) => {
                                    await save.mutateAsync(updatedState);
                                }}
                            />
                        ) : (
                            <div className="p-4 text-xs text-slate-500">No editable summary text.</div>
                        )}
                    </div>
                )}
            </main>

            {/* Compact Bottom Bar: Audit Info & Hash */}
            <footer className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setShowAuditTrail(!showAuditTrail)}
                        className="hover:text-slate-800 underline font-medium"
                    >
                        {showAuditTrail ? "Hide audit trail" : "Audit trail"} ({data.decisions.length})
                    </button>
                    <span>·</span>
                    <span className="font-mono text-[10px] text-slate-400">
                        hash: {data.result_hash ? `${data.result_hash.slice(0, 12)}…` : "none"}
                    </span>
                </div>
                <div>
                    {approved ? (
                        <span className="text-emerald-700 font-medium">✓ Certified for draft generation</span>
                    ) : (
                        <span>Lawyer verification workspace</span>
                    )}
                </div>
            </footer>

            {/* Audit Trail Drawer (Collapsible) */}
            {showAuditTrail && (
                <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3 text-xs max-h-40 overflow-y-auto">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-700">Audit Trail Decisions:</span>
                        <button
                            type="button"
                            onClick={() => setShowAuditTrail(false)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    </div>
                    {data.decisions.length === 0 ? (
                        <p className="text-slate-400">No decisions recorded yet.</p>
                    ) : (
                        <ul className="space-y-1">
                            {data.decisions.map((d) => (
                                <li key={d.id} className="text-[11px] text-slate-600">
                                    <strong className="uppercase">{d.action.replaceAll("_", " ")}</strong> ·{" "}
                                    {new Date(d.created_at).toLocaleString("en-IN")}{" "}
                                    {d.comment ? `— "${d.comment}"` : ""}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Request Changes Modal */}
            {showChangesModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <h3 className="font-bold text-slate-900 text-sm">Request Summary Changes</h3>
                            <button
                                type="button"
                                onClick={() => setShowChangesModal(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-xs text-slate-600">
                            Explain what details need revision or correction.
                        </p>
                        <textarea
                            placeholder="Explain what needs to be changed..."
                            value={comment}
                            maxLength={2000}
                            disabled={pending}
                            onChange={(e) => setComment(e.target.value)}
                            className="w-full rounded-md border border-slate-300 p-2.5 text-xs focus:ring-1 focus:ring-indigo-500"
                            rows={4}
                        />
                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setShowChangesModal(false)}
                                className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={pending || dirty || !comment.trim()}
                                onClick={() => decide.mutate("request_changes")}
                                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                {decide.isPending ? "Submitting…" : "Submit Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
