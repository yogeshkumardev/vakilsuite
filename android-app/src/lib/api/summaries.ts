import type { components } from "@/types/generated-api";
import { apiClient } from "@/lib/api/client";

export type SummarySourceCandidate = components["schemas"]["SummarySourceCandidateResponse"];
export type SummaryRun = components["schemas"]["SummaryRunResponse"];
export type SummaryRunDetail = components["schemas"]["SummaryRunDetailResponse"];

export function listSummarySourceCandidates(caseId: string): Promise<SummarySourceCandidate[]> {
  return apiClient.get(`/cases/${caseId}/summary-source-candidates`);
}

export function listSummaryRuns(caseId: string): Promise<SummaryRun[]> {
  return apiClient.get(`/cases/${caseId}/summary-runs`);
}

export function prepareSummaryRun(caseId: string, sources: { working_document_id: string; revision_id: string; expected_revision_sha256: string }[], original_pdf_sources: {document_id:string;file_version_id:string;sha256:string}[] = [], output_language: "en-IN"|"hi-IN" = "en-IN"): Promise<SummaryRun> {
  return apiClient.post(`/cases/${caseId}/summary-runs`, { sources, original_pdf_sources, output_language });
}

export function submitSummaryRun(caseId: string, runId: string): Promise<{ id: string; status: string }> {
  return apiClient.post(`/cases/${caseId}/summary-runs/${runId}/submit`);
}

export function getSummaryRun(caseId: string, runId: string): Promise<SummaryRunDetail> {
  return apiClient.get(`/cases/${caseId}/summary-runs/${runId}`);
}

export function decideSummaryReview(
  caseId: string,
  runId: string,
  body: {
    action: "approve" | "request_changes";
    expected_result_hash: string;
    expected_review_version: number;
    comment?: string;
  },
): Promise<SummaryRunDetail> {
  return apiClient.post(`/cases/${caseId}/summary-runs/${runId}/review`, body);
}

export function getSummarySource(caseId:string,runId:string,findingId:string,index:number):Promise<components["schemas"]["SummarySourceView"]> {
 return apiClient.get(`/cases/${caseId}/summary-runs/${runId}/sources/${encodeURIComponent(findingId)}/${index}`);
}
