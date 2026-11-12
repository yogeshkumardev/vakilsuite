import type { components } from "@/types/generated-api";
import { apiClient } from "./client";

export type OkfTemplate = components["schemas"]["OkfTemplateOptionResponse"];
export type OkfAnnexureCandidate = components["schemas"]["OkfAnnexureCandidateResponse"];
export type OkfExportPreview = components["schemas"]["OkfExportPreviewResponse"];
export type OkfContext = components["schemas"]["OkfContextResponse"];
export type OkfSelection = components["schemas"]["PrepareOkfExportPreviewRequest"];

type ApiEnvelope<T> = { success: true; data: T };

export const okfExportsApi = {
    listAuthorityManifests: async (caseId: string, offset = 0): Promise<components["schemas"]["AuthorityManifestResponse"][]> => {
        const response = await apiClient.get<ApiEnvelope<components["schemas"]["AuthorityManifestResponse"][]>>(`/cases/${caseId}/authority-manifests?offset=${offset}`);
        return response.data;
    },
    preflight: async (caseId: string, id: string, body: components["schemas"]["DraftPreflightRequest"]): Promise<components["schemas"]["DraftPreflightResponse"]> => {
        const response = await apiClient.post<ApiEnvelope<components["schemas"]["DraftPreflightResponse"]>>(`/cases/${caseId}/okf-contexts/${id}/draft-preflight`, body);
        return response.data;
    },
    saveContext: async (caseId: string, body: components["schemas"]["SaveOkfContextRequest"]): Promise<OkfContext> => {
        const response = await apiClient.post<ApiEnvelope<OkfContext>>(`/cases/${caseId}/okf-contexts`, body);
        return response.data;
    },
    getContext: async (caseId: string, id: string): Promise<OkfContext> => {
        const response = await apiClient.get<ApiEnvelope<OkfContext>>(`/cases/${caseId}/okf-contexts/${id}`);
        return response.data;
    },
    listTemplates: async (caseId: string): Promise<OkfTemplate[]> => {
        const response = await apiClient.get<ApiEnvelope<OkfTemplate[]>>(`/cases/${caseId}/okf-templates`);
        return response.data;
    },
    listAnnexures: async (caseId: string): Promise<OkfAnnexureCandidate[]> => {
        const response = await apiClient.get<ApiEnvelope<OkfAnnexureCandidate[]>>(`/cases/${caseId}/okf-annexure-candidates`);
        return response.data;
    },
    preview: async (caseId: string, body: components["schemas"]["PrepareOkfExportPreviewRequest"]): Promise<OkfExportPreview> => {
        const response = await apiClient.post<ApiEnvelope<OkfExportPreview>>(`/cases/${caseId}/okf-export-preview`, body);
        return response.data;
    },
};
