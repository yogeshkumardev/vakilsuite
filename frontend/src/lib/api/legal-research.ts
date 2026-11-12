import type { components } from "@/types/generated-api";
import { apiClient } from "./client";

export type LegalResearchConfig = components["schemas"]["LegalResearchConfigResponse"];
export type LegalResearchRun = components["schemas"]["LegalResearchRunResponse"];
export type CreateLegalResearchRun = components["schemas"]["CreateResearchRunRequest"];
export type LegalAuthority = components["schemas"]["AuthorityResponse"];
export type LegalPassage = components["schemas"]["AuthorityPassageResponse"];
export type LegalProposition = components["schemas"]["PropositionResponse"];
export type AuthorityReview = components["schemas"]["AuthorityReviewResponse"];

type ApiEnvelope<T> = { success: true; data: T };

/** Legal research requests are explicit: rendering/config reads never bill upstream. */
export const legalResearchApi = {
    getConfig: async (caseId: string): Promise<LegalResearchConfig> => {
        const response = await apiClient.get<ApiEnvelope<LegalResearchConfig>>(
            `/cases/${caseId}/legal-research/config`,
        );
        return response.data;
    },
    createRun: async (caseId: string, body: CreateLegalResearchRun): Promise<LegalResearchRun> => {
        const response = await apiClient.post<ApiEnvelope<LegalResearchRun>>(
            `/cases/${caseId}/legal-research/runs`, body,
        );
        return response.data;
    },
    listRuns: async (caseId: string): Promise<LegalResearchRun[]> => {
        const response = await apiClient.get<ApiEnvelope<LegalResearchRun[]>>(`/cases/${caseId}/legal-research/runs`);
        return response.data;
    },
    submitRun: async (caseId: string, runId: string): Promise<LegalResearchRun> => {
        const response = await apiClient.post<ApiEnvelope<LegalResearchRun>>(`/cases/${caseId}/legal-research/runs/${runId}/submit`);
        return response.data;
    },
    fetchAuthority: async (caseId: string, documentId: number, runId: string): Promise<LegalAuthority> => {
        const response = await apiClient.post<ApiEnvelope<LegalAuthority>>(`/cases/${caseId}/legal-research/authorities/${documentId}/checks`, { run_id: runId, include_fragment: true });
        return response.data;
    },
    getAuthority: async (caseId: string, authorityId: string): Promise<LegalAuthority> => (await apiClient.get<ApiEnvelope<LegalAuthority>>(`/cases/${caseId}/legal-research/authorities/${authorityId}`)).data,
    createPassage: async (caseId: string, authorityId: string, body: components["schemas"]["AuthorityPassageRequest"]): Promise<LegalPassage> => (await apiClient.post<ApiEnvelope<LegalPassage>>(`/cases/${caseId}/legal-research/authorities/${authorityId}/passages`, body)).data,
    createProposition: async (caseId: string, body: components["schemas"]["CreatePropositionRequest"]): Promise<LegalProposition> => (await apiClient.post<ApiEnvelope<LegalProposition>>(`/cases/${caseId}/legal-research/propositions`, body)).data,
    decideReview: async (caseId: string, reviewId: string, body: components["schemas"]["DecideAuthorityReviewRequest"]): Promise<AuthorityReview> => (await apiClient.post<ApiEnvelope<AuthorityReview>>(`/cases/${caseId}/legal-research/reviews/${reviewId}/decision`, body)).data,
};
