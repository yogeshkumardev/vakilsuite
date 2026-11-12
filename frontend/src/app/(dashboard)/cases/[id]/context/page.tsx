"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { SummaryViewer } from "@/components/context/SummaryViewer";
import {
    useCaseSummary,
    useDocumentsReadiness,
    useRegenerateSummary,
} from "@/features/context/hooks/useContext";
import {
    useDraftList,
    useArchiveDraft,
} from "@/features/drafts/hooks/useDrafts";
import { DraftTypeSelector } from "@/components/context/DraftTypeSelector";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

// ── Readiness Banner ───────────────────────────────────────────────────────────

function ReadinessBanner({ caseId }: { caseId: string }) {
    const { data: readiness, isLoading } = useDocumentsReadiness(caseId);

    if (isLoading || !readiness || readiness.total === 0) return null;

    const { total, ready, all_ready, documents } = readiness;
    const pct = Math.round((ready / total) * 100);

    if (all_ready) {
        return (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-3">
                <span className="text-emerald-600 text-lg">✓</span>
                <div>
                    <p className="text-sm font-semibold text-emerald-800">
                        All {total} documents are ready!
                    </p>
                    <p className="text-xs text-emerald-600 mt-0.5">
                        Approved typed revisions are ready for downstream ingestion.
                    </p>
                </div>
            </div>
        );
    }

    // Not all ready — show progress
    const notReady = documents.filter(d => !d.is_ready);
    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-amber-800">
                    {ready}/{total} documents ready
                </p>
                <span className="text-xs text-amber-600 font-medium">{pct}%</span>
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                />
            </div>

            {/* Pending documents */}
            <div className="space-y-1">
                {notReady.slice(0, 4).map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 text-xs text-amber-700">
                        <span className="text-amber-400">○</span>
                        <span className="truncate font-medium">{doc.name}</span>
                        <span className="text-amber-500 shrink-0">
                            — {doc.missing_steps.map(s =>
                                s === "ocr"                ? "OCR needed"
                              : s === "typed_content"      ? "content not saved"
                              : s === "extraction_review"  ? "extraction not reviewed"
                              : s
                            ).join(", ")}
                        </span>
                    </div>
                ))}
                {notReady.length > 4 && (
                    <p className="text-xs text-amber-500">
                        …and {notReady.length - 4} more
                    </p>
                )}
            </div>

            <Link
                href={`/cases/${caseId}`}
                className="inline-block text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
                Go to documents →
            </Link>
        </div>
    );
}

// ── Generate Summary Button ────────────────────────────────────────────────────

function GenerateSummaryButton({ caseId }: { caseId: string }) {
    const { data: summary } = useCaseSummary(caseId);
    const regenerate = useRegenerateSummary(caseId);

    // Already has a fresh summary — don't show the big CTA
    if (summary && !summary.is_stale) return null;

    return (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-5 py-4 flex items-center justify-between gap-4">
            <div>
                <p className="text-sm font-semibold text-indigo-800">
                    {summary?.is_stale ? "Summary is outdated" : "No summary yet"}
                </p>
                <p className="text-xs text-indigo-600 mt-0.5">
                    {summary?.is_stale
                        ? "Context was updated. Regenerate to reflect the latest documents."
                        : "Add case facts below, then generate the AI case summary."}
                </p>
            </div>
            <button
                type="button"
                onClick={() => regenerate.mutate()}
                disabled={regenerate.isPending}
                className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
                {regenerate.isPending ? "Generating…" : summary?.is_stale ? "Regenerate Summary" : "Generate Case Summary"}
            </button>
        </div>
    );
}

// ── Context Page ───────────────────────────────────────────────────────────────

export default function CaseContextPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.id as string;

    const { data: summary } = useCaseSummary(caseId);
    const { data: drafts } = useDraftList(caseId);
    const archiveDraft = useArchiveDraft(caseId);

    const isDraftBlocked = !summary || summary.is_stale;

    return (
        <WorkspacePage variant="wide" className="grid gap-5 lg:grid-cols-3">
            {/* Left: Readiness + Summary */}
            <div className="space-y-4 lg:col-span-2">

                {/* Document readiness banner */}
                <ReadinessBanner caseId={caseId} />

                {/* Generate Summary CTA */}
                <GenerateSummaryButton caseId={caseId} />

                {/* Summary */}
                <SummaryViewer caseId={caseId} />
            </div>

            {/* Right: Draft generation + list */}
            <div className="space-y-5">
                <DraftTypeSelector caseId={caseId} disabled={isDraftBlocked} />

                {drafts && drafts.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-5">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3">
                            Drafts
                        </h3>
                        <div className="space-y-2">
                            {drafts.map((draft) => (
                                <div
                                    key={draft.id}
                                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2.5 hover:border-slate-200 transition-colors"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">
                                            {draft.title}
                                        </p>
                                        <p className="text-xs text-slate-400 capitalize">
                                            {draft.status} · v{draft.version}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                        <button
                                            type="button"
                                            onClick={() => router.push(`/cases/${caseId}/drafts/${draft.id}`)}
                                            className="text-xs font-medium text-slate-500 hover:text-slate-800"
                                        >
                                            Open
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => archiveDraft.mutate(draft.id)}
                                            className="text-xs text-slate-300 hover:text-red-500"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </WorkspacePage>
    );
}
