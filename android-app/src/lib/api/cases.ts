import { apiClient } from "@/lib/api/client";
import { Case, CaseDetail, CaseType, PaginationMeta } from "@/types/api";

export interface CreateCaseRequest {
  case_title: string;
  case_type: CaseType;
  petitioner_name: string;
}

export async function listCases(page = 1, search = "") {
  return apiClient.get<{ cases: Case[]; pagination: PaginationMeta }>(`/cases?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
}

export async function getCase(caseId: string) {
  return apiClient.get<{ case: CaseDetail }>(`/cases/${caseId}`);
}

export async function createCase(payload: CreateCaseRequest) {
  return apiClient.post<{ case: CaseDetail }>("/cases", payload);
}
