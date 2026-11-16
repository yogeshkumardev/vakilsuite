import { apiClient } from "./client";
import type { components } from "@/types/generated-api";

type Envelope<T> = { success: true; data: T };
export type CourtDraft = components["schemas"]["CourtDraftResponse"];
export type DraftReadiness = components["schemas"]["ReadinessResponse"];
export type AdvocateProfile = components["schemas"]["AdvocateProfileResponse"];
export type AdvocateProfileUpdate = components["schemas"]["AdvocateProfileUpdate"];
export type CourtDraftGeneration = components["schemas"]["CourtDraftGenerationResponse"];
export type CourtDraftEditor = components["schemas"]["CourtDraftEditorResponse"];
export type DurableJob = components["schemas"]["JobOut"];
export type CourtDraftExport = components["schemas"]["CourtDraftExportResponse"];

export const courtDraftsApi = {
    readiness: async (caseId: string): Promise<DraftReadiness> =>
        (await apiClient.get<Envelope<DraftReadiness>>(`/cases/${caseId}/draft-readiness`)).data,
    create: async (caseId: string, body: components["schemas"]["CreateCourtDraftRequest"]): Promise<CourtDraft> =>
        (await apiClient.post<Envelope<CourtDraft>>(`/cases/${caseId}/court-drafts`, body)).data,
    update: async (caseId: string, draftId: string, body: components["schemas"]["UpdateCourtDraftRequest"]): Promise<CourtDraft> =>
        (await apiClient.patch<Envelope<CourtDraft>>(`/cases/${caseId}/court-drafts/${draftId}`, body)).data,
    get: async (caseId: string, draftId: string): Promise<CourtDraft> =>
        (await apiClient.get<Envelope<CourtDraft>>(`/cases/${caseId}/court-drafts/${draftId}`)).data,
    startGeneration: async (caseId: string, draftId: string, body: components["schemas"]["StartCourtDraftGenerationRequest"]): Promise<CourtDraftGeneration> =>
        (await apiClient.post<Envelope<CourtDraftGeneration>>(`/cases/${caseId}/court-drafts/${draftId}/generate`, body)).data,
    openWordEditor: async (caseId: string, draftId: string): Promise<CourtDraftEditor> =>
        (await apiClient.post<Envelope<CourtDraftEditor>>(`/cases/${caseId}/court-drafts/${draftId}/word-editor`)).data,
    getJob: async (jobId: string): Promise<DurableJob> =>
        (await apiClient.get<Envelope<DurableJob>>(`/jobs/${jobId}`)).data,
    enqueueExport: async (caseId: string, draftId: string, body: components["schemas"]["EnqueueCourtDraftExportRequest"]): Promise<CourtDraftExport> =>
        (await apiClient.post<Envelope<CourtDraftExport>>(`/cases/${caseId}/court-drafts/${draftId}/exports`, body)).data,
    downloadExportPath: (caseId: string, draftId: string, jobId: string) =>
        `/api/v1/cases/${caseId}/court-drafts/${draftId}/exports/${jobId}/download`,
    getProfile: async (): Promise<AdvocateProfile> =>
        (await apiClient.get<Envelope<AdvocateProfile>>("/profile")).data,
    updateProfile: async (body: AdvocateProfileUpdate): Promise<AdvocateProfile> =>
        (await apiClient.patch<Envelope<AdvocateProfile>>("/profile", body)).data,
    updateCourtRegistration: async (courtCode: string, body: components["schemas"]["AdvocateCourtRegistrationUpdate"]): Promise<AdvocateProfile> =>
        (await apiClient.put<Envelope<AdvocateProfile>>(`/profile/court-registrations/${courtCode}`, body)).data,
};
