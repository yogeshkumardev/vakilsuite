import {
  ApiResponse,
  BenchType,
  Case,
  CaseAccess,
  CaseDetail,
  CaseNumber,
  CaseNumberType,
  CaseSection,
  CaseStatus,
  CaseType,
  PaginationMeta,
  Party,
  PartyType
} from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) {
    throw new Error(res.error.message);
  }
  return res.data;
}

function buildQuery(params: object) {
  const qs = new URLSearchParams();

  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      qs.set(key, String(value));
    }
  });

  return qs.toString();
}

// ============================================================
// REQUEST TYPES (FIX)
// ============================================================

export interface CreateCaseRequest {
  case_title: string;
  case_type: CaseType;
  bench_type?: BenchType;
  petitioner_name: string;
  respondent_name?: string;
  act_name?: string;
  court_number?: string;
  brief_facts?: string;
  filing_date?: string;
  next_hearing_date?: string;
  lower_court_decision_date?: string;
  bail_rejection_date?: string;
  limitation_expiry_date?: string;
  notes?: string;
  case_numbers?: CreateCaseNumberRequest[];
  sections?: CreateCaseSectionRequest[];
  parties?: CreatePartyRequest[];
}

export interface UpdateCaseRequest extends Partial<CreateCaseRequest> {
  stage?: string;
  status?: CaseStatus;
}

export interface CreateCaseNumberRequest {
  number_type: CaseNumberType;
  case_number: string;
  court_name?: string;
  year?: number;
  is_primary?: boolean;
  notes?: string;
}

export interface CreateCaseSectionRequest {
  section: string;
  act_name: string;
  notes?: string;
}

export interface CreatePartyRequest {
  name: string;
  party_type: PartyType;
  address?: string;
  phone?: string;
  notes?: string;
}

export interface ListCasesParams {
  page?: number;
  limit?: number;
  status?: CaseStatus;
  case_type?: CaseType;
  search?: string;
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const casesApi = {
  // ------------------------------------------------------------
  // CASES
  // ------------------------------------------------------------

  create: async (data: CreateCaseRequest) => {
    const res = await apiClient.post<
      ApiResponse<{ case: CaseDetail }>
    >("/cases", data);

    return unwrap(res).case;
  },

  list: async (params: ListCasesParams = {}) => {
      const query = buildQuery(params);

      const res = await apiClient.get<
        ApiResponse<{
        cases: Case[];
        pagination: PaginationMeta;
    }>
  >(`/cases${query ? `?${query}` : ""}`);

    return unwrap(res);
  },

  get: async (caseId: string) => {
    const res = await apiClient.get<
      ApiResponse<{ case: CaseDetail }>
    >(`/cases/${caseId}`);

    return unwrap(res).case;
  },

  update: async (caseId: string, data: UpdateCaseRequest) => {
    const res = await apiClient.patch<
      ApiResponse<{ case: Case }>
    >(`/cases/${caseId}`, data);

    return unwrap(res).case;
  },

  softDelete: async (caseId: string) => {
    const res = await apiClient.post<ApiResponse<Record<string, never>>>(`/cases/${caseId}/soft-delete`, {});
    return unwrap(res);
  },

  archive: async (caseId: string) => {
    await apiClient.delete<ApiResponse<Record<string, never>>>(
      `/cases/${caseId}`,
    );
  },

  // ------------------------------------------------------------
  // CASE NUMBERS
  // ------------------------------------------------------------

  addNumber: async (caseId: string, data: CreateCaseNumberRequest) => {
    const res = await apiClient.post<
      ApiResponse<{ case_number: CaseNumber }>
    >(`/cases/${caseId}/numbers`, data);

    return unwrap(res).case_number;
  },

  updateNumber: async (
    numberId: string,
    data: Partial<CreateCaseNumberRequest>,
  ) => {
    const res = await apiClient.patch<
      ApiResponse<{ case_number: CaseNumber }>
    >(`/case-numbers/${numberId}`, data);

    return unwrap(res).case_number;
  },

  deleteNumber: async (numberId: string) => {
    await apiClient.delete<ApiResponse<Record<string, never>>>(
      `/case-numbers/${numberId}`,
    );
  },

  // ------------------------------------------------------------
  // SECTIONS
  // ------------------------------------------------------------

  addSection: async (caseId: string, data: CreateCaseSectionRequest) => {
    const res = await apiClient.post<
      ApiResponse<{ section: CaseSection }>
    >(`/cases/${caseId}/sections`, data);

    return unwrap(res).section;
  },

  removeSection: async (sectionId: string) => {
    const res = await apiClient.delete<
      ApiResponse<{ section: CaseSection }>
    >(`/case-sections/${sectionId}`);

    return unwrap(res).section;
  },

  getSectionsHistory: async (caseId: string) => {
    const res = await apiClient.get<
      ApiResponse<{ sections: CaseSection[] }>
    >(`/cases/${caseId}/sections/history`);

    return unwrap(res).sections;
  },

  // ------------------------------------------------------------
  // PARTIES
  // ------------------------------------------------------------

  addParty: async (caseId: string, data: CreatePartyRequest) => {
    const res = await apiClient.post<
      ApiResponse<{ party: Party }>
    >(`/cases/${caseId}/parties`, data);

    return unwrap(res).party;
  },

  updateParty: async (
    partyId: string,
    data: Partial<CreatePartyRequest>,
  ) => {
    const res = await apiClient.patch<
      ApiResponse<{ party: Party }>
    >(`/parties/${partyId}`, data);

    return unwrap(res).party;
  },

  deleteParty: async (partyId: string) => {
    await apiClient.delete<ApiResponse<Record<string, never>>>(
      `/parties/${partyId}`,
    );
  },

  // ------------------------------------------------------------
  // ACCESS
  // ------------------------------------------------------------

  grantAccess: async (
    caseId: string,
    userId: string,
    canEdit: boolean,
  ) => {
    const res = await apiClient.post<
      ApiResponse<{ access: CaseAccess }>
    >(`/cases/${caseId}/access`, {
      user_id: userId,
      can_edit: canEdit,
    });

    return unwrap(res).access;
  },

  revokeAccess: async (caseId: string, userId: string) => {
    await apiClient.delete<ApiResponse<Record<string, never>>>(
      `/cases/${caseId}/access/${userId}`,
    );
  },
};
