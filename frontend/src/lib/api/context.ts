import { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface DocumentReadinessItem {
    id: string;
    name: string;
    document_type: string;
    ocr_status: string;
    is_ready: boolean;
    missing_steps: string[];
}

export interface DocumentsReadiness {
    total: number;
    ready: number;
    all_ready: boolean;
    pending_ocr: number;
    pending_typed: number;
    pending_extraction: number;
    documents: DocumentReadinessItem[];
}

export interface CaseContext {
    id: string;
    case_id: string;
    context_json: Record<string, unknown>;
    pushed_documents: Record<string, unknown>;
    pushed_document_ids?: string[];
    token_estimate: number | null;
    version: number;
    last_updated_at: string;
}

export function getContextDocumentIds(context: CaseContext | null | undefined) {
    if (!context) return [];
    if (Array.isArray(context.pushed_document_ids)) {
        return context.pushed_document_ids;
    }
    return Object.keys(context.pushed_documents ?? {});
}

export interface CaseSummary {
    id: string;
    case_id: string;
    summary_text: string;
    context_snapshot_hash: string;
    generated_at: string;
    is_stale: boolean;
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
        throw new Error(`${res.error.code}: ${res.error.message}`);
    }
    return res.data;
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const contextApi = {
    // ------------------------------------------------------------
    // GET CONTEXT
    // ------------------------------------------------------------
    getContext: async (caseId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ context: CaseContext }>
        >(`/cases/${caseId}/context`);

        return unwrap(res).context;
    },

    // ------------------------------------------------------------
    // CLEAR CONTEXT
    // ------------------------------------------------------------
    clearContext: async (caseId: string) => {
        const res = await apiClient.post<
            ApiResponse<{ context: CaseContext }>
        >(`/cases/${caseId}/context/clear`);

        return unwrap(res).context;
    },

    // ------------------------------------------------------------
    // GET SUMMARY
    // ------------------------------------------------------------
    getSummary: async (caseId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ summary: CaseSummary }>
        >(`/cases/${caseId}/summary`);

        return unwrap(res).summary;
    },

    // ------------------------------------------------------------
    // REGENERATE SUMMARY
    // ------------------------------------------------------------
    regenerateSummary: async (caseId: string) => {
        const res = await apiClient.post<
            ApiResponse<{ summary: CaseSummary }>
        >(`/cases/${caseId}/summary/regenerate`);

        return unwrap(res).summary;
    },

    // ------------------------------------------------------------
    // UPDATE CONTEXT DOCUMENT CONTENT
    // ------------------------------------------------------------
    updateContextDocument: async (caseId: string, documentId: string, htmlContent: string) => {
        const res = await apiClient.patch<ApiResponse<Record<string, never>>>(
            `/cases/${caseId}/context/documents/${documentId}`,
            { html_content: htmlContent },
        );
        return unwrap(res);
    },

    // ------------------------------------------------------------
    // DOCUMENTS READINESS
    // ------------------------------------------------------------
    getDocumentsReadiness: async (caseId: string): Promise<DocumentsReadiness> => {
        const res = await apiClient.get<
            ApiResponse<DocumentsReadiness>
        >(`/cases/${caseId}/documents/readiness`);

        return unwrap(res);
    },
};
