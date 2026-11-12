"use client";

export function TokenEstimateBanner({ tokenEstimate }: { tokenEstimate: number }) {
    if (tokenEstimate < 80000) return null;

    return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
            <strong>⚠ Large Context:</strong> Your case context is approximately{" "}
            {Math.round(tokenEstimate / 1000)}k tokens. Consider clearing older documents to improve AI response quality.
        </div>
    );
}
