"use client";

import {
    useCaseSummary,
    useRegenerateSummary,
} from "@/features/context/hooks/useContext";
import { StaleSummaryBanner } from "./StaleSummaryBanner";

export function SummaryViewer({ caseId }: { caseId: string }) {
    const { data: summary, isLoading, isError } = useCaseSummary(caseId);
    const regenerate = useRegenerateSummary(caseId);

    if (isLoading) {
        return <div className='h-32 rounded-lg bg-slate-100 animate-pulse' />;
    }

    if (isError || !summary) {
        return (
            <div className='rounded-lg border border-dashed border-slate-200 p-6 text-center'>
                <p className='text-sm text-slate-400'>
                    No case summary has been generated yet.
                </p>
            </div>
        );
    }

    return (
        <div className='space-y-3'>
            {summary.is_stale && (
                <StaleSummaryBanner
                    onRegenerate={() => regenerate.mutate()}
                    regenerating={regenerate.isPending}
                />
            )}
            <div className='rounded-lg border border-slate-200 bg-white p-5'>
                <div className='flex items-center justify-between mb-3'>
                    <h3 className='text-sm font-semibold text-slate-800'>
                        Case Summary
                    </h3>
                    <div className='flex items-center gap-2'>
                        <span className='text-xs text-slate-400'>
                            {new Date(summary.generated_at).toLocaleDateString(
                                "en-IN",
                            )}
                        </span>
                        <button
                            type='button'
                            onClick={() => regenerate.mutate()}
                            disabled={regenerate.isPending}
                            className='text-xs text-slate-400 hover:text-slate-700 disabled:opacity-50'
                            title='Regenerate summary'
                        >
                            ↺
                        </button>
                    </div>
                </div>
                <div className='text-sm text-slate-700 leading-relaxed whitespace-pre-wrap'>
                    {summary.summary_text}
                </div>
            </div>
        </div>
    );
}
