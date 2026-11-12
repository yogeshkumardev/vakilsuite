import type { components } from "@/types/generated-api";
export type Document = components["schemas"]["DocumentResponse"];

import { ApiResponse, DocumentType } from "@/types/api";
import { apiClient } from "./client";
import type { StructuredDocument } from "@/features/documents/editor/structure";

export interface ApprovalExpectation { revision_id: string; lock_version: number; content_hash: string }
export type SaveRevisionInput = { revision_id: string; lock_version: number } & (
    { content_markdown: string; canonical_structure?: never } |
    { canonical_structure: StructuredDocument; content_markdown?: never }
);

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type DocReviewStatus =
    | "pending"
    | "reviewed"
    | "review_required"
    | "approved"
    | "pushed";
export type ProcessingRoute =
    | "pending"
    | "scanned_ocr"
    | "digital_extract"
    | "hybrid_extract";
export type ProcessingStatus =
    | "pending"
    | "queued"
    | "processing"
    | "completed"
    | "ready_for_review"
    | "approved"
    | "failed";
export type ProcessingRunStatus =
    | "uploaded"
    | "queued"
    | "splitting_pages"
    | "classifying_pages"
    | "extracting_pages"
    | "ocr_running"
    | "typing_pages"
    | "stitching_pages"
    | "structured_extraction"
    | "ready_for_review"
    | "reviewed"
    | "approved"
    | "docx_ready"
    | "failed";

export interface DocumentReviewPage {
    page_number: number;
    source_filename?: string | null;
    text: string;
    raw_text?: string;
    uncertain_words?: string[];
    issue_flags?: string[];
    warnings?: string[];
}

export interface DocumentStructuredExtraction {
    result?: {
        document_type?: string;
        pages?: Array<{ page_number: number; summary?: string; warnings?: string[] }>;
        statements?: Array<{
            text: string;
            statement_type?: string;
            source_pages?: number[];
            paragraph_number?: string | null;
            warnings?: string[];
        }>;
        dates?: Array<{
            raw_text: string;
            normalized_date?: string | null;
            context?: string;
            source_pages?: number[];
            warning?: string | null;
        }>;
        names?: Array<{
            raw_text: string;
            role?: string;
            normalized_name?: string | null;
            source_pages?: number[];
            warning?: string | null;
        }>;
        unclear_words?: string[];
        warnings?: string[];
        formatting_plan?: Array<{
            block_type: string;
            text: string;
            source_pages?: number[];
            style_hint?: string | null;
        }>;
    };
}

export interface DocumentSourceArtifact {
    provider?: string;
    pages?: DocumentReviewPage[];
    stitching?: {
        page_count?: number;
        warnings?: string[];
        pages?: DocumentReviewPage[];
    };
    structured_extraction?: DocumentStructuredExtraction;
    [key: string]: unknown;
}

// Retained only for dormant review/editor components, never a current API response.
export interface LegacyDocument {
    id: string;
    case_id: string;
    uploaded_by: string;
    original_filename: string;
    r2_key: string;
    r2_bucket: string;
    mime_type: string;
    file_size_bytes: number;
    document_type: DocumentType;
    display_name: string | null;
    ocr_raw_text: string | null;
    upload_status: "pending" | "uploading" | "uploaded" | "failed";
    ocr_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "not_required";
    ocr_language: string | null;
    page_count: number | null;
    ocr_job_id: string | null;
    ocr_error: string | null;
    ocr_provider: string | null;
    ocr_started_at: string | null;
    ocr_completed_at: string | null;
    is_scanned: boolean;
    processing_route: ProcessingRoute;
    processing_status: ProcessingStatus;
    processing_job_id: string | null;
    processing_error: string | null;
    processing_started_at: string | null;
    processing_completed_at: string | null;
    source_text: string | null;
    source_artifact: DocumentSourceArtifact | null;
    classification_details: Record<string, unknown> | null;
    reviewed_content: string | null;
    review_status: DocReviewStatus;
    active_processing_run_id: string | null;
    latest_typed_revision_id: string | null;
    approved_typed_revision_id: string | null;
    created_at: string;
    updated_at: string;
}

export type PresignUploadResponse = components["schemas"]["PresignUploadResponse"];

export interface JobStatusResponse {
    status: "pending" | "processing" | "completed" | "failed";
    result: Record<string, unknown> | null;
    error: string | null;
    updated_at: string;
}

export interface ProcessingPage {
    page_number: number;
    status: string;
    classification: "digital" | "scanned" | "digital_low_quality" | "blank" | "failed" | null;
    extraction_method: "embedded_text" | "vision_ocr" | "none" | null;
    warnings: string[];
    error: string | null;
}

export interface ProcessingRun {
    id: string;
    document_id: string;
    job_id: string;
    pipeline_version?: string | null;
    status: ProcessingRunStatus;
    error: string | null;
    total_pages: number;
    completed_pages: number;
    failed_pages: number;
    vision_provider_key: string | null;
    typing_provider_key: string | null;
    started_at: string;
    completed_at: string | null;
    pages?: ProcessingPage[];
}

export interface TypedRevision {
    id: string;
    document_id: string;
    processing_run_id: string | null;
    parent_revision_id: string | null;
    revision_number: number;
    lock_version: number;
    content_markdown: string;
    content_hash: string;
    canonical_structure: CanonicalDocument | StructuredDocument;
    canonical_schema_version: number;
    status: "draft" | "approved" | "superseded";
    created_by: string;
    approved_by: string | null;
    approved_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface CanonicalSourceReference {
    page_number: number;
    confidence: number | null;
    coordinates: number[] | null;
}

export interface CanonicalField {
    label: string;
    value: string;
}

export type CanonicalBlockType =
    | "heading"
    | "paragraph"
    | "key_value"
    | "table"
    | "list"
    | "signature"
    | "page_break"
    | "generic";

export interface CanonicalDocumentBlock {
    id: string;
    type: CanonicalBlockType;
    semantic_role: string;
    heading: string | null;
    text: string | null;
    level: number | null;
    fields: CanonicalField[];
    headers: string[];
    rows: string[][];
    items: string[];
    ordered: boolean;
    source_refs: CanonicalSourceReference[];
    confidence: number | null;
    warnings: string[];
    review_required: boolean;
}

export interface CanonicalDocument {
    schema_version: number;
    document_type: string;
    title: string | null;
    blocks: CanonicalDocumentBlock[];
    warnings: string[];
    unresolved_block_count: number;
    source_markdown_hash: string;
}

export type ConfirmUploadResult = components["schemas"]["ConfirmUploadResponse"];

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

export const documentsApi = {
    presign: async (
        caseId: string,
        data: components["schemas"]["PresignUploadRequest"],
    ) => {
        const res = await apiClient.post<
            ApiResponse<PresignUploadResponse>
        >(`/cases/${caseId}/documents/presign`, data);

        return unwrap(res);
    },

    confirmUpload: async (documentId: string) => {
        const res = await apiClient.post<
            ApiResponse<ConfirmUploadResult>
        >(`/documents/${documentId}/confirm-upload`, {});

        return unwrap(res);
    },

    list: async (caseId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ documents: Document[] }>
        >(`/cases/${caseId}/documents`);

        return unwrap(res).documents;
    },

    get: async (documentId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ document: Document }>
        >(`/documents/${documentId}`);

        return unwrap(res).document;
    },

    update: async (
        documentId: string,
        data: { document_type?: DocumentType; display_name?: string },
    ) => {
        const res = await apiClient.patch<
            ApiResponse<{ document: Document }>
        >(`/documents/${documentId}`, data);

        return unwrap(res).document;
    },

    reprocess: async (documentId: string, pipelineVersion: "understanding" = "understanding") => {
        const res = await apiClient.post<
            ApiResponse<{ job_id: string }>
        >(`/documents/${documentId}/processing-runs`, { pipeline_version: pipelineVersion });

        return unwrap(res).job_id;
    },

    getProcessingProgress: async (documentId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ processing_run: ProcessingRun }>
        >(`/documents/${documentId}/processing-progress`);
        return unwrap(res).processing_run;
    },

    retryPage: async (documentId: string, pageNumber: number) => {
        const res = await apiClient.post<ApiResponse<{ job_id: string }>>(
            `/documents/${documentId}/pages/${pageNumber}/retry`,
            {},
        );
        return unwrap(res).job_id;
    },

    getTypedRevision: async (documentId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ typed_revision: TypedRevision }>
        >(`/documents/${documentId}/typed-version`);
        return unwrap(res).typed_revision;
    },

    saveTypedRevision: async (
        documentId: string,
        input: SaveRevisionInput,
    ) => {
        const res = await apiClient.patch<
            ApiResponse<{ typed_revision: TypedRevision }>
        >(`/documents/${documentId}/typed-version`, input);
        return unwrap(res).typed_revision;
    },

    approveTypedRevision: async (documentId: string, expected?: ApprovalExpectation) => {
        const res = await apiClient.post<
            ApiResponse<{ revision: TypedRevision; event_id: string }>
        >(`/documents/${documentId}/typed-version/approve`, expected ?? {});
        return unwrap(res);
    },

    getViewUrl: async (documentId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ url: string; expires_at: string }>
        >(`/documents/${documentId}/view-url`);

        return unwrap(res);
    },

    delete: async (documentId: string) => {
        await apiClient.delete<ApiResponse<Record<string, never>>>(
            `/documents/${documentId}`,
        );
        return true;
    },

    getJobStatus: async (jobId: string) => {
        const res = await apiClient.get<
            ApiResponse<JobStatusResponse>
        >(`/jobs/${jobId}`);

        return unwrap(res);
    },
};

// ------------------------------------------------------------
// JOB POLLING HELPER (NEW)
// ------------------------------------------------------------

export async function pollJob(
    jobId: string,
    interval = 2000,
    timeout = 60000,
): Promise<JobStatusResponse> {
    const start = Date.now();

    while (true) {
        const status = await documentsApi.getJobStatus(jobId);

        if (status.status === "completed" || status.status === "failed") {
            return status;
        }

        if (Date.now() - start > timeout) {
            throw new Error("Job polling timeout");
        }

        await new Promise((r) => setTimeout(r, interval));
    }
}

// ------------------------------------------------------------
// R2 UPLOAD (IMPROVED)
// ------------------------------------------------------------

export async function uploadFileToR2(
    presignedUrl: string,
    file: File,
    onProgress?: (percent: number) => void,
    signal?: AbortSignal,
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        if (signal) {
            signal.addEventListener("abort", () => {
                xhr.abort();
                reject(new Error("Upload aborted"));
            });
        }

        xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100));
            }
        });

        xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`R2 upload failed: ${xhr.status}`));
            }
        });

        xhr.addEventListener("error", () =>
            reject(new Error("R2 upload network error")),
        );

        xhr.open("PUT", presignedUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
    });
}
