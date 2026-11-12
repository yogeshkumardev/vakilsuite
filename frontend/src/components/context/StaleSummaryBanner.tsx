"use client";

export function StaleSummaryBanner({
    onRegenerate,
    regenerating,
}: {
    onRegenerate: () => void;
    regenerating: boolean;
}) {
    return (
        <div className='flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3'>
            <div className='flex items-center gap-2'>
                <span className='text-amber-500'>⚠️</span>
                <p className='text-sm text-amber-800 font-medium'>
                    Context updated. Regenerate summary before generating a
                    draft.
                </p>
            </div>
            <button
                type='button'
                onClick={onRegenerate}
                disabled={regenerating}
                className='rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors'
            >
                {regenerating ? "Regenerating…" : "Regenerate"}
            </button>
        </div>
    );
}
