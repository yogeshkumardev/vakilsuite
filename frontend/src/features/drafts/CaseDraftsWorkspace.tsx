"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { summariesApi } from "@/lib/api/summaries";
import { workingDocumentsApi } from "@/lib/api/working-documents";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { Alert } from "@/components/ui/Alert";
import { Surface } from "@/components/ui/Surface";
import { WorkingDocumentWorkspace } from "@/features/working-documents/WorkingDocumentWorkspace";

export function CaseDraftsWorkspace({ caseId }: { caseId: string }) {
    const scope = useAuthStore((s) => s.generation);
    const chamber = useChamberStore((s) => s.selected?.id);
    const searchParams = useSearchParams();

    const summaries = useQuery({
        queryKey: ["summary-runs", caseId, scope, chamber],
        queryFn: () => summariesApi.listRuns(caseId),
    });
    const documents = useQuery({
        queryKey: ["case-drafts", caseId, scope, chamber],
        queryFn: () => workingDocumentsApi.listForCase(caseId),
    });

    const approvedSummaries = useMemo(
        () => summaries.data?.filter((s) => s.status === "completed") ?? [],
        [summaries.data]
    );

    const drafts = useMemo(() => {
        if (!documents.data?.length) return [];
        return documents.data.filter(
            (d) =>
                d.document_kind.includes("draft") ||
                d.title.toLowerCase().includes("draft") ||
                d.title.toLowerCase().includes("s528") ||
                d.title.toLowerCase().includes("quashing") ||
                d.title.toLowerCase().includes("bail")
        );
    }, [documents.data]);

    const urlDocId = searchParams.get("doc");
    const [selectedDraftIdOverride, setSelectedDraftIdOverride] = useState<string | null>(null);

    const selectedDraftId = useMemo(() => {
        if (selectedDraftIdOverride && drafts.some((d) => d.id === selectedDraftIdOverride)) {
            return selectedDraftIdOverride;
        }
        if (urlDocId && drafts.some((d) => d.id === urlDocId)) {
            return urlDocId;
        }
        return drafts[0]?.id ?? null;
    }, [selectedDraftIdOverride, urlDocId, drafts]);

    const latestApproved = approvedSummaries[0];

    // Loading & error states
    if (summaries.isPending || documents.isPending) {
        return (
            <WorkspacePage className="space-y-4">
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    <span className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    Loading drafts workspace…
                </div>
            </WorkspacePage>
        );
    }

    if (summaries.error || documents.error) {
        return (
            <WorkspacePage className="space-y-4">
                <Alert tone="danger" title="Unable to load drafts">
                    {(summaries.error ?? documents.error)?.message}
                </Alert>
            </WorkspacePage>
        );
    }

    // ── IF DRAFTS EXIST: Show rich text editor inside Drafts tab ───────
    if (drafts.length > 0 && selectedDraftId) {
        return (
            <div className="flex flex-col h-[calc(100dvh-3.5rem)] min-w-0">
                {/* Drafts Top Navigation Bar — Slim & Compact */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-1.5 shrink-0">
                    <div className="flex items-center gap-1.5 overflow-x-auto min-w-0">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
                            Drafts ({drafts.length}):
                        </span>
                        {drafts.map((d) => {
                            const isSelected = d.id === selectedDraftId;
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setSelectedDraftIdOverride(d.id)}
                                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold shrink-0 transition ${
                                        isSelected
                                            ? "bg-indigo-600 text-white shadow-2xs"
                                            : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                                    }`}
                                >
                                    <span>📜</span>
                                    <span className="max-w-[180px] truncate">{d.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {latestApproved ? (
                            <Link
                                href={`/cases/${caseId}/drafts/new/${latestApproved.id}`}
                                className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs hover:bg-indigo-100 transition"
                            >
                                <span>⚡</span>
                                <span>New Draft</span>
                            </Link>
                        ) : null}
                    </div>
                </div>

                {/* Embedded Full Lexical Rich Text Editor */}
                <div className="flex-1 min-h-0 min-w-0">
                    <WorkingDocumentWorkspace
                        key={selectedDraftId}
                        caseId={caseId}
                        workingDocumentId={selectedDraftId}
                        embedded={true}
                        showOriginals={false}
                    />
                </div>
            </div>
        );
    }

    // ── IF NO DRAFTS EXIST: Show Empty / Draft Generation Onboarding ───────
    return (
        <WorkspacePage className="space-y-6 max-w-4xl py-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Case Drafts</h1>
                <p className="mt-1 text-sm text-slate-600">
                    Generate and review legal petitions for this case using certified summary facts and citations.
                </p>
            </div>

            {/* Empty state prompt */}
            <Surface as="section" variant="bordered" className="p-8 rounded-xl text-center space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-2xl font-bold">
                    📜
                </div>
                <div>
                    <h2 className="text-lg font-bold text-slate-900">
                        No Drafts Generated Yet
                    </h2>
                    <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                        Once you generate a petition (such as a Section 528 Quashing or Bail application), it will be opened directly in the Rich Text Editor here.
                    </p>
                </div>

                <div className="pt-2">
                    {latestApproved ? (
                        <Link
                            href={`/cases/${caseId}/drafts/new/${latestApproved.id}`}
                            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-md hover:bg-indigo-700 transition"
                        >
                            <span>⚡ Generate Draft with AI</span>
                            <span>→</span>
                        </Link>
                    ) : (
                        <div className="space-y-2">
                            <button
                                disabled
                                className="min-h-11 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white opacity-50 cursor-not-allowed"
                            >
                                ⚡ Generate Draft with AI
                            </button>
                            <p className="text-xs text-amber-700 font-medium">
                                Please approve the case summary first to unlock AI draft generation.
                            </p>
                            <div>
                                <Link
                                    href={`/cases/${caseId}/summary`}
                                    className="text-xs font-semibold text-indigo-600 hover:underline"
                                >
                                    Go to Case Summary →
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </Surface>
        </WorkspacePage>
    );
}
