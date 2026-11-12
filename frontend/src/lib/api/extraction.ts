import { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type ExtractionStatus =
    | "pending"
    | "processing"
    | "completed"
    | "failed";

export type ReviewStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "edited";

export interface ExtractionResult {
    id: string;
    document_id: string;
    case_id: string;
    extracted_fields: Record<string, unknown>;
    formatted_content: string | null;
    confidence_score: number | null;
    extraction_status: ExtractionStatus;
    review_status: ReviewStatus;
    reviewed_by: string | null;
    reviewed_at: string | null;
    user_edits: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
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

export const extractionApi = {
    // ------------------------------------------------------------
    // EXTRACTION
    // ------------------------------------------------------------

    getExtraction: async (documentId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ extraction_result: ExtractionResult }>
        >(`/documents/${documentId}/extraction`);

        return unwrap(res).extraction_result;
    },

    retryExtraction: async (documentId: string) => {
        const res = await apiClient.post<
            ApiResponse<{ job_id: string }>
        >(`/documents/${documentId}/extraction/run`);

        return unwrap(res).job_id;
    },

    reviewExtraction: async (
        extractionId: string,
        data: {
            extracted_fields: Record<string, unknown>;
            review_status: ReviewStatus;
            formatted_content?: string;
        },
    ) => {
        const res = await apiClient.patch<
            ApiResponse<{ extraction_result: ExtractionResult }>
        >(`/extraction/${extractionId}`, data);

        return unwrap(res).extraction_result;
    },

};

// ------------------------------------------------------------
// JOB POLLING (REUSE PATTERN)
// ------------------------------------------------------------

export async function pollExtractionJob(
    jobId: string,
    interval = 2000,
    timeout = 60000,
) {
    const start = Date.now();

    while (true) {
        const res = await apiClient.get<
            ApiResponse<{
                status: "pending" | "processing" | "completed" | "failed";
            }>
        >(`/jobs/${jobId}`);

        const data = unwrap(res);

        if (data.status === "completed" || data.status === "failed") {
            return data;
        }

        if (Date.now() - start > timeout) {
            throw new Error("Extraction polling timeout");
        }

        await new Promise((r) => setTimeout(r, interval));
    }
}
