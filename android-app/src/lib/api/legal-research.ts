import type { components } from "@/types/generated-api";
import { apiClient } from "@/lib/api/client";

export type LegalResearchConfig = components["schemas"]["LegalResearchConfigResponse"];
export type LegalResearchRun = components["schemas"]["LegalResearchRunResponse"];
export type CreateLegalResearchRun = components["schemas"]["CreateResearchRunRequest"];
export type LegalAuthority = components["schemas"]["AuthorityResponse"];
export type LegalPassage = components["schemas"]["AuthorityPassageResponse"];
export type LegalProposition = components["schemas"]["PropositionResponse"];
export type AuthorityReview = components["schemas"]["AuthorityReviewResponse"];

export function getLegalResearchConfig(caseId: string): Promise<LegalResearchConfig> {
  return apiClient.get(`/cases/${caseId}/legal-research/config`);
}

/** Starts only a local durable run record; upstream dispatch remains policy-gated. */
export function createLegalResearchRun(
  caseId: string,
  body: CreateLegalResearchRun,
): Promise<LegalResearchRun> {
  return apiClient.post(`/cases/${caseId}/legal-research/runs`, body);
}

export function listLegalResearchRuns(caseId: string): Promise<LegalResearchRun[]> {
  return apiClient.get(`/cases/${caseId}/legal-research/runs`);
}

export function submitLegalResearchRun(caseId: string, runId: string): Promise<LegalResearchRun> {
  return apiClient.post(`/cases/${caseId}/legal-research/runs/${runId}/submit`);
}

export function fetchLegalAuthority(caseId: string, documentId: number, runId: string): Promise<LegalAuthority> { return apiClient.post(`/cases/${caseId}/legal-research/authorities/${documentId}/checks`, { run_id: runId, include_fragment: true }); }
export function getLegalAuthority(caseId: string, authorityId: string): Promise<LegalAuthority> { return apiClient.get(`/cases/${caseId}/legal-research/authorities/${authorityId}`); }
export function createLegalPassage(caseId: string, authorityId: string, body: components["schemas"]["AuthorityPassageRequest"]): Promise<LegalPassage> { return apiClient.post(`/cases/${caseId}/legal-research/authorities/${authorityId}/passages`, body); }
export function createLegalProposition(caseId: string, body: components["schemas"]["CreatePropositionRequest"]): Promise<LegalProposition> { return apiClient.post(`/cases/${caseId}/legal-research/propositions`, body); }
export function decideLegalAuthorityReview(caseId: string, reviewId: string, body: components["schemas"]["DecideAuthorityReviewRequest"]): Promise<AuthorityReview> { return apiClient.post(`/cases/${caseId}/legal-research/reviews/${reviewId}/decision`, body); }
