import type { components } from "@/types/generated-api";
import { apiClient } from "./client";

export type SummarySourceCandidate = components["schemas"]["SummarySourceCandidateResponse"];
export type SummaryRun = components["schemas"]["SummaryRunResponse"];
export type SummaryRunDetail = components["schemas"]["SummaryRunDetailResponse"];

type ApiEnvelope<T> = { success: true; data: T };

export const summariesApi = {
    source: async (caseId:string,runId:string,findingId:string,index:number):Promise<components["schemas"]["SummarySourceView"]> => (await apiClient.get<ApiEnvelope<components["schemas"]["SummarySourceView"]>>(`/cases/${caseId}/summary-runs/${runId}/sources/${encodeURIComponent(findingId)}/${index}`)).data,
    listSourceCandidates: async (caseId: string): Promise<SummarySourceCandidate[]> => {
        const response = await apiClient.get<ApiEnvelope<SummarySourceCandidate[]>>(
            `/cases/${caseId}/summary-source-candidates`,
        );
        return response.data;
    },
    listRuns: async (caseId: string): Promise<SummaryRun[]> => {
        const response = await apiClient.get<ApiEnvelope<SummaryRun[]>>(
            `/cases/${caseId}/summary-runs`,
        );
        return response.data;
    },
    prepare: async (
        caseId: string,
        sources: Array<{
            working_document_id: string;
            revision_id: string;
            expected_revision_sha256: string;
        }>,
        originalPdfSources: Array<{document_id:string;file_version_id:string;sha256:string}> = [],
        outputLanguage: "en-IN"|"hi-IN" = "en-IN",
    ): Promise<SummaryRun> => {
        const response = await apiClient.post<ApiEnvelope<SummaryRun>>(
            `/cases/${caseId}/summary-runs`,
            { sources, original_pdf_sources: originalPdfSources, output_language: outputLanguage },
        );
        return response.data;
    },
    submit: async (caseId: string, runId: string): Promise<{ id: string; status: string }> => {
        const response = await apiClient.post<ApiEnvelope<{ id: string; status: string }>>(
            `/cases/${caseId}/summary-runs/${runId}/submit`,
            undefined,
            { timeoutMs: 90000 },
        );
        return response.data;
    },
    getRun: async (caseId: string, runId: string): Promise<SummaryRunDetail> => {
        const response = await apiClient.get<ApiEnvelope<SummaryRunDetail>>(
            `/cases/${caseId}/summary-runs/${runId}`,
        );
        return response.data;
    },
    saveEditor: async (caseId: string, runId: string, body: components["schemas"]["SaveSummaryEditorRequest"]): Promise<SummaryRunDetail> => {
        const response = await apiClient.patch<ApiEnvelope<SummaryRunDetail>>(`/cases/${caseId}/summary-runs/${runId}/editor`, body);
        return response.data;
    },
    decideReview: async (
        caseId: string,
        runId: string,
        body: {
            action: "approve" | "request_changes";
            expected_result_hash: string;
            expected_review_version: number;
            comment?: string;
            acknowledge_incomplete?: boolean;
        },
    ): Promise<SummaryRunDetail> => {
        const response = await apiClient.post<ApiEnvelope<SummaryRunDetail>>(
            `/cases/${caseId}/summary-runs/${runId}/review`,
            body,
        );
        return response.data;
    },
};
