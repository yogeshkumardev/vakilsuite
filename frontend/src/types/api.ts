// ─────────────────────────────────────────────────────────────
// Enums (must match backend exactly)
// ─────────────────────────────────────────────────────────────

export type UserRole = "lawyer" | "munshi" | "admin";
export type AuthProvider = "email" | "google";
export type Designation = "advocate" | "aor" | "senior_advocate";

// Centralized ISO date type
export type ISODateString = string;

// Safe API unwrap helper (VERY IMPORTANT)
export function unwrapApi<T>(res: ApiResponse<T>): T {
    if (!res.success) {
        throw new Error(res.error.message);
    }
    return res.data;
}

// Type guard
export function isApiError(res: ApiResponse<unknown>): res is ApiError {
    return res.success === false;
}



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

export type BenchType = "single_bench" | "division_bench" | "full_bench";

export type CaseStage =
    | "filing"
    | "admission"
    | "notice"
    | "counter_affidavit"
    | "rejoinder"
    | "arguments"
    | "judgment"
    | "disposed"
    | "transferred";

export type CaseStatus = "active" | "disposed" | "archived";

export type CaseNumberType =
    | "lower_court"
    | "high_court"
    | "supreme_court"
    | "connected_matter"
    | "other";

export type PartyType =
    | "petitioner"
    | "respondent"
    | "intervener"
    | "amicus"
    | "witness"
    | "other";

// ─────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────

export interface User {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
    auth_provider: AuthProvider;
    is_email_verified: boolean;
    is_active: boolean;
    is_profile_complete: boolean;

    // Lawyer profile
    enrollment_number: string | null;
    designation: Designation | null;
    chamber_number: string | null;
    court_name: string | null;

    // Address
    office_address_line1: string | null;
    office_address_line2: string | null;
    city: string | null;
    district: string | null;
    state: string | null;

    // Contact
    mobile_number: string | null;
    alternate_mobile: string | null;

    // Preferences
    default_district: string | null;

    last_login_at: string | null;
    created_at: string;
    updated_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Case
// ─────────────────────────────────────────────────────────────

export interface Case {
    id: string;
    lawyer_id: string;
    case_title: string;
    case_type: CaseType;
    bench_type: BenchType;
    stage: CaseStage;
    status: CaseStatus;
    court_number: string | null;
    petitioner_name: string;
    respondent_name: string;
    act_name: string | null;
    brief_facts: string | null;
    filing_date: string | null;
    next_hearing_date: string | null;
    lower_court_decision_date: string | null;
    bail_rejection_date: string | null;
    limitation_expiry_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

export interface CaseDetail extends Case {
    case_numbers: CaseNumber[];
    sections: CaseSection[];
    parties: Party[];
}

export interface CaseNumber {
    id: string;
    case_id: string;
    number_type: CaseNumberType;
    case_number: string;
    court_name: string | null;
    year: number | null;
    is_primary: boolean;
    notes: string | null;
    created_at: string;
}

export interface CaseSection {
    id: string;
    case_id: string;
    section: string;
    act_name: string;
    is_active: boolean;
    added_by: string;
    added_at: string;
    removed_by: string | null;
    removed_at: string | null;
    notes: string | null;
}

export interface CaseAccess {
    id: string;
    case_id: string;
    user_id: string;
    granted_by: string;
    can_edit: boolean;
    created_at: string;
}

export interface Party {
    id: string;
    case_id: string;
    name: string;
    party_type: PartyType;
    address: string | null;
    phone: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

// ─────────────────────────────────────────────────────────────
// API Envelope
// ─────────────────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
    success: true;
    data: T;
    message?: string;
}

export interface ApiError {
    success: false;
    error: {
        code: string;
        message: string;       
        details?: Record<string, unknown>;
    };
}

export type FieldErrorMap = Record<string, string[]>;


export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export interface PaginatedSuccess<T> {
    success: true;
    data: T[];
    pagination: PaginationMeta;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

export interface AuthTokens {
    access_token: string;
    token_type: "bearer";
    user: User;
}

// ─────────────────────────────────────────────────────────────
// Display helpers
// ─────────────────────────────────────────────────────────────

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

export const BENCH_TYPE_LABELS: Record<BenchType, string> = {
    single_bench: "Single Bench",
    division_bench: "Division Bench",
    full_bench: "Full Bench",
};

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
    filing: "Filing",
    admission: "Admission",
    notice: "Notice",
    counter_affidavit: "Counter Affidavit",
    rejoinder: "Rejoinder",
    arguments: "Arguments",
    judgment: "Judgment",
    disposed: "Disposed",
    transferred: "Transferred",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
    active: "Active",
    disposed: "Disposed",
    archived: "Archived",
};

export const CASE_NUMBER_TYPE_LABELS: Record<CaseNumberType, string> = {
    lower_court: "Lower Court",
    high_court: "High Court",
    supreme_court: "Supreme Court",
    connected_matter: "Connected Matter",
    other: "Other",
};

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
    petitioner: "Petitioner",
    respondent: "Respondent",
    intervener: "Intervener",
    amicus: "Amicus Curiae",
    witness: "Witness",
    other: "Other",
};

export type DocumentType =
    | "fir"
    | "chargesheet"
    | "summon"
    | "bail_rejection_order"
    | "bail_order"
    | "affidavit"
    | "counter_affidavit"
    | "rejoinder"
    | "vakalatnama"
    | "judgment"
    | "court_order"
    | "other";


export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
    fir: "FIR",
    chargesheet: "Chargesheet",
    summon: "Summon",
    bail_rejection_order: "Bail Rejection Order",
    bail_order: "Bail Order",
    affidavit: "Affidavit",
    counter_affidavit: "Counter Affidavit",
    rejoinder: "Rejoinder",
    vakalatnama: "Vakalatnama",
    judgment: "Judgment",
    court_order: "Court Order",
    other: "Other",
};

