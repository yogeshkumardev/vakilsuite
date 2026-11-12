import { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface CauseListing {
    id: string;
    listing_date: string;
    court_number: string;
    serial_number: number | null;
    case_number: string | null;
    case_title: string | null;
    petitioner: string | null;
    respondent: string | null;
    advocate_name: string | null;
    case_type_raw: string | null;
    remarks: string | null;
    matched_case_id: string | null;
    scraped_at: string;
    created_at: string;
}

export interface ScrapeJobResult {
    job_id: string;
    date: string;
    message: string;
}

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

function unwrap<T>(res: ApiResponse<T>): T {
    if (!res.success) {
        throw new Error(`${res.error.code}: ${res.error.message}`);
    }
    return res.data;
}

function buildQuery(params: Record<string, unknown>) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            qs.set(key, String(value));
        }
    });
    return qs.toString();
}

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const causeListingsApi = {
    // Paginated listings from DB
    getListings: async (date?: string, courtNumber?: string, search?: string) => {
        const query = buildQuery({ date, court_number: courtNumber, search });
        const res = await apiClient.get<ApiResponse<{ listings: CauseListing[]; date: string }>>(
            `/cause-listings${query ? `?${query}` : ""}`
        );
        return unwrap(res);
    },

    // My matched cases
    getMyMatches: async (date?: string) => {
        const query = buildQuery({ date });
        const res = await apiClient.get<ApiResponse<{ matches: CauseListing[] }>>(
            `/cause-listings/my-cases${query ? `?${query}` : ""}`
        );
        return unwrap(res).matches;
    },

    // Trigger background scrape (any user) → returns job_id
    triggerScrape: async (date: string) => {
        const res = await apiClient.post<ApiResponse<ScrapeJobResult>>(
            `/cause-listings/scrape`,
            { date }
        );
        return unwrap(res);
    },

    // Admin refresh (kept for admin panel)
    refreshListings: async (date?: string) => {
        const res = await apiClient.post<ApiResponse<{ job_id: string }>>(
            `/cause-listings/refresh`,
            date ? { date } : {}
        );
        return unwrap(res).job_id;
    },
};
