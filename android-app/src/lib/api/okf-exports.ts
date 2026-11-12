import type { components } from "@/types/generated-api";
import { apiClient } from "@/lib/api/client";

export type OkfTemplate = components["schemas"]["OkfTemplateOptionResponse"];
export type OkfAnnexureCandidate = components["schemas"]["OkfAnnexureCandidateResponse"];
export type OkfExportPreview = components["schemas"]["OkfExportPreviewResponse"];

export function listOkfTemplates(caseId: string): Promise<OkfTemplate[]> {
  return apiClient.get(`/cases/${caseId}/okf-templates`);
}

export function listOkfAnnexures(caseId: string): Promise<OkfAnnexureCandidate[]> {
  return apiClient.get(`/cases/${caseId}/okf-annexure-candidates`);
}

export function prepareOkfExportPreview(
  caseId: string,
  body: components["schemas"]["PrepareOkfExportPreviewRequest"],
): Promise<OkfExportPreview> {
  return apiClient.post(`/cases/${caseId}/okf-export-preview`, body);
}

export type OkfContext = components["schemas"]["OkfContextResponse"];
export type OkfSelection = components["schemas"]["PrepareOkfExportPreviewRequest"];
export function saveOkfContext(caseId: string, body: components["schemas"]["SaveOkfContextRequest"]): Promise<OkfContext> {
  return apiClient.post(`/cases/${caseId}/okf-contexts`, body);
}
export function getOkfContext(caseId: string, id: string): Promise<OkfContext> {
  return apiClient.get(`/cases/${caseId}/okf-contexts/${id}`);
}
export function preflightOkfContext(caseId: string, id: string, body: components["schemas"]["DraftPreflightRequest"]): Promise<components["schemas"]["DraftPreflightResponse"]> {
  return apiClient.post(`/cases/${caseId}/okf-contexts/${id}/draft-preflight`, body);
}

export function listAuthorityManifests(caseId: string, offset = 0): Promise<components["schemas"]["AuthorityManifestResponse"][]> {
  return apiClient.get(`/cases/${caseId}/authority-manifests?offset=${offset}`);
}
