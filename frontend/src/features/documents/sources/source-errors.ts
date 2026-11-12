export function typingFailureMessage(code: string | null | undefined, canRestart = false): string {
    if (code === "OCR_OUTPUT_TRUNCATED") return "Typing stopped before the complete text was produced. Your original is safe. Start a new typing attempt when ready; it may use your chamber’s typing budget.";
    if (canRestart) return "Typing didn’t start because the document or settings changed. Start typing again when your edits have saved.";
    if (code === "OCR_RATE_LIMITED") return "The typing service is busy or its quota is exhausted. Wait a little, then try typing again.";
    if (code === "OCR_PROVIDER_TRANSIENT") return "The typing service is temporarily unavailable. It will retry shortly; your document has not been typed yet.";
    if (code === "OCR_PROVIDER_AUTH") return "The typing service needs its access settings checked by your chamber administrator.";
    if (code === "OCR_MODEL_UNAVAILABLE") return "The configured typing model is unavailable. Ask your chamber administrator to check it before retrying.";
    if (code === "OCR_REQUEST_REJECTED" || code === "OCR_INPUT_TOO_LARGE") return "The typing service couldn’t accept this document. Check the document and processing settings before retrying.";
    if (code === "OCR_OUTCOME_UNKNOWN_NO_RETRY" || code === "PROVIDER_OUTCOME_UNKNOWN_NO_RETRY") return "Typing was interrupted. You can try typing again; you’ll be asked to confirm a possible additional charge.";
    if (code === "OCR_INVALID_OR_STALE_OUTPUT") return "Typing didn’t produce a complete, current result. Your text hasn’t been replaced. You can try again or continue editing manually.";
    if (code === "OCR_RETRY_CONFIRMATION_REQUIRED") return "Typing needs a fresh confirmation before another paid attempt can start.";
    return "Document typing is unavailable right now. Your original is available below, and you can continue typing manually.";
}


// Deliberately map by status/code, never expose server/provider exception strings.
export function sourceFailureMessage(error: unknown, action: "load" | "type" | "save" | "review"): string {
    const failure = error as { status?: number; code?: string } | null;
    if (failure?.status === 401) return "Your session needs refreshing. Sign in again before continuing.";
    if (failure?.status === 403) return "You don’t have permission for this action. Ask your chamber administrator for access.";
    if (failure?.status === 404) return "This document is no longer available in the selected chamber. Return to Documents to check it.";
    if (failure?.status === 429) return "Processing is busy. Wait a little before trying again. You can still view the original and review saved text.";
    if (failure?.status === 409) return action === "save" || action === "review"
        ? "The saved text changed elsewhere. Keep your edits here, copy any unsaved text, then reopen the document to review the latest version."
        : "The document or processing settings changed. Refresh its status before continuing.";
    if (failure?.status === 422 && action === "review") return "Every original page needs reviewed text. Add an explicit note for any genuinely blank page, save, then confirm again.";
    if (failure?.status === 422 && action === "type") return "Typing cannot start with the current document or processing settings. Ask your chamber administrator to check the model and budget.";
    if (action === "load") return "The original is still available. We couldn’t refresh its text workspace. Retry when your connection is ready.";
    if (action === "save") return "Your latest edits haven’t saved. Keep this page open and retry saving when your connection is ready.";
    if (action === "review") return "Your review wasn’t confirmed. Keep the text open, check your connection, then try again.";
    return "We couldn’t confirm whether typing started. Refresh its status before trying again; your original and saved text are unchanged.";
}

export function retrySourceInspection(failures: number, error: unknown): boolean {
    const status = (error as { status?: number } | null)?.status;
    return failures < 2 && (status === 0 || (status !== undefined && status >= 500));
}
