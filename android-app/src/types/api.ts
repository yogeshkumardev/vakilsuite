export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export type UserRole = "lawyer" | "munshi" | "admin";

export type CaseType =
  | "writ_petition"
  | "pil"
  | "criminal_revision"
  | "criminal_appeal"
  | "bail_application"
  | "anticipatory_bail"
  | "quashing"
  | "civil_revision"
  | "first_appeal"
  | "second_appeal"
  | "contempt"
  | "other";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_profile_complete: boolean;
  auth_provider: "email" | "google";
  is_email_verified: boolean;
  mobile_number?: string | null;
  enrollment_number?: string | null;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  session_id: string;
  user: User;
}

export interface DeviceSession {
  id: string;
  device_type: "web" | "android" | "ios" | "unknown";
  device_name: string | null;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export interface Case {
  id: string;
  lawyer_id: string;
  case_title: string;
  case_type: CaseType;
  stage: string;
  status: string;
  petitioner_name: string;
  respondent_name: string;
  created_at: string;
  updated_at: string;
}

export interface CaseDetail extends Case {
  case_numbers: unknown[];
  sections: unknown[];
  parties: unknown[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export type Document = import("./generated-api").components["schemas"]["DocumentResponse"];

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  writ_petition: "Writ Petition",
  pil: "PIL",
  criminal_revision: "Criminal Revision",
  criminal_appeal: "Criminal Appeal",
  bail_application: "Bail Application",
  anticipatory_bail: "Anticipatory Bail",
  quashing: "Quashing",
  civil_revision: "Civil Revision",
  first_appeal: "First Appeal",
  second_appeal: "Second Appeal",
  contempt: "Contempt",
  other: "Other",
};
