type SummaryFailure = {
    status?: number;
    code?: string;
    message?: string;
} | null | undefined;

/** Keep provider-policy details and transient queue guidance distinct. */
export function summaryFailureMessage(failure: SummaryFailure): string {
    if (failure?.status === 403) {
        return "Case-summary AI is not enabled for this chamber. A chamber administrator must enable the Summary provider policy before a new summary can be started.";
    }
    if (failure?.status === 409) {
        return "The document set or chamber policy changed. Refresh readiness, confirm the current documents, then start a new summary.";
    }
    if (failure?.status === 422) {
        return "This summary request does not meet the chamber's current processing limits. Refresh readiness and adjust the document set if needed.";
    }
    if (failure?.status === 0) {
        return "Could not reach the server. Check the connection and retry.";
    }
    return "The summary could not be started. Refresh status before retrying.";
}

export function summaryFailureMayHaveQueuedWork(failure: SummaryFailure): boolean {
    return failure?.status !== 403 && failure?.status !== 409 && failure?.status !== 422;
}

export function summaryRunFailureMessage(code: string): string {
    const messages: Record<string, string> = {
        INVALID_INPUT: "The AI provider rejected this summary request. No result was generated. You can start a new attempt from Case Summary after the processing issue is resolved.",
        TIMEOUT: "The AI provider did not respond before the time limit. No summary was saved; the provider's billing outcome is unknown. You can start a new attempt from Case Summary.",
        INVALID_PROVIDER_OUTPUT: "The AI response did not pass summary validation. Review the documents, then start a new attempt from Case Summary.",
        INVALID_RESPONSE: "The AI provider returned an incomplete or incorrectly formatted summary. No reviewable result was saved. You can start a new attempt from Case Summary.",
        INPUT_LIMIT_EXCEEDED: "The complete document set exceeds the chamber's summary input limit.",
        BUDGET_OR_PRICING_CHANGED: "The summary estimate or pricing configuration changed. Start a new attempt after the chamber settings are checked.",
        ORIGINAL_PDF_UNAVAILABLE: "An original PDF could not be read. Check the document and try again.",
        POLICY_CHANGED: "The chamber's AI policy changed. Prepare a new summary with the current documents.",
    };
    return messages[code] ?? "This attempt did not produce a reviewable summary. Check the documents and start a new attempt if needed.";
}
