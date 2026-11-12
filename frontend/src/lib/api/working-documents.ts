import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import type { components } from "@/types/generated-api";
import { apiClient } from "./client";

export type WorkingDocument = components["schemas"]["WorkingDocumentDetailResponse"];
export type WorkingDocumentSummary = components["schemas"]["WorkingDocumentSummaryResponse"];
export type WorkingDocumentRevision = components["schemas"]["WorkingDocumentRevisionResponse"];
export type WorkingDocumentEligibility = components["schemas"]["EligibilityResponse"];
export type ExportJob = { id: string; status: "queued" | "running" | "succeeded" | "failed" | "cancelled"; output_format: "docx" | "pdf"; revision_id: string; artifact_ready: boolean };
export type JobStatus = { id: string; status: ExportJob["status"]; error_message: string | null; result_summary: { file_name?: string } | null };

type ApiEnvelope<T> = { success: true; data: T };

export interface CreateWorkingDocumentInput {
    title: string;
    document_kind?: string;
    editor_document: PersistedEditorDocument;
}

export interface CreateWorkingDocumentRevisionInput {
    expected_revision_number: number;
    client_mutation_id: string;
    editor_document: PersistedEditorDocument;
}

/**
 * Typed transport for the S05 immutable revision API.  Save orchestration is
 * deliberately not here: S05-03 adds expected-version conflict handling
 * before an editor can use it for autosave.
 */
export const workingDocumentsApi = {
    create: async (caseId: string, input: CreateWorkingDocumentInput): Promise<WorkingDocument> => {
        const response = await apiClient.post<ApiEnvelope<WorkingDocument>>(
            `/cases/${caseId}/working-documents`,
            input,
        );
        return response.data;
    },
    listForCase: async (caseId: string): Promise<WorkingDocumentSummary[]> => {
        const response = await apiClient.get<ApiEnvelope<WorkingDocumentSummary[]>>(
            `/cases/${caseId}/working-documents`,
        );
        return response.data;
    },
    get: async (documentId: string): Promise<WorkingDocument> => {
        const response = await apiClient.get<ApiEnvelope<WorkingDocument>>(
            `/working-documents/${documentId}`,
        );
        return response.data;
    },
    createRevision: async (
        documentId: string,
        input: CreateWorkingDocumentRevisionInput,
    ): Promise<WorkingDocumentRevision> => {
        const response = await apiClient.post<ApiEnvelope<WorkingDocumentRevision>>(
            `/working-documents/${documentId}/revisions`,
            input,
        );
        return response.data;
    },
    submitRevision: async (
        documentId: string,
        revisionId: string,
        expectedContentSha256: string,
    ): Promise<WorkingDocumentRevision> => {
        const response = await apiClient.post<ApiEnvelope<WorkingDocumentRevision>>(
            `/working-documents/${documentId}/revisions/${revisionId}/submit`,
            { expected_content_sha256: expectedContentSha256 },
        );
        return response.data;
    },
    decideRevision: async (
        documentId: string,
        revisionId: string,
        input: {
            action: "approve" | "request_changes" | "revoke";
            expected_content_sha256: string;
            comment?: string;
        },
    ): Promise<WorkingDocumentRevision> => {
        const response = await apiClient.post<ApiEnvelope<WorkingDocumentRevision>>(
            `/working-documents/${documentId}/revisions/${revisionId}/decision`,
            input,
        );
        return response.data;
    },
    resolveEligibility: async (
        documentId: string,
        input: {
            revision_id: string;
            expected_revision_sha256: string;
            sources?: Array<{
                file_version_id: string;
                expected_sha256: string;
                first_page?: number;
                last_page?: number;
            }>;
        },
    ): Promise<WorkingDocumentEligibility> => {
        const response = await apiClient.post<ApiEnvelope<WorkingDocumentEligibility>>(
            `/working-documents/${documentId}/eligibility`,
            input,
        );
        return response.data;
    },
    enqueueExport: async (documentId: string, input: { revision_id: string; expected_content_sha256: string; output_format: "docx" | "pdf"; idempotency_key: string }): Promise<ExportJob> => {
        const response = await apiClient.post<ApiEnvelope<ExportJob>>(`/working-documents/${documentId}/exports`, input);
        return response.data;
    },
    getJob: async (jobId: string): Promise<JobStatus> => {
        const response = await apiClient.get<ApiEnvelope<JobStatus>>(`/jobs/${jobId}`);
        return response.data;
    },
    downloadExportUrl: (documentId: string, jobId: string) => `/api/v1/working-documents/${documentId}/exports/${jobId}/download`,
};
