import { ApiResponse } from "@/types/api";
import { apiClient, getAccessToken } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type DraftType =
    | "bail_application"
    | "anticipatory_bail"
    | "writ_petition"
    | "pil"
    | "criminal_revision"
    | "quashing_petition"
    | "affidavit"
    | "counter_affidavit"
    | "rejoinder"
    | "synopsis"
    | "other";

export type DraftStatus =
    | "generating"
    | "ready"
    | "editing"
    | "final"
    | "archived";

export interface Draft {
    id: string;
    case_id: string;
    created_by: string;
    draft_type: DraftType;
    title: string;
    content: string | null;
    version: number;
    status: DraftStatus;
    generated_by_ai: boolean;
    parent_draft_id: string | null;
    reviewed_by: string | null;
    reviewed_at: string | null;
    final_accepted_at: string | null;
    exported_by: string | null;
    exported_at: string | null;
    created_at: string;
    updated_at: string;
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

// ------------------------------------------------------------
// LABELS
// ------------------------------------------------------------

export const DRAFT_TYPE_LABELS: Record<DraftType, string> = {
    bail_application: "Bail Application",
    anticipatory_bail: "Anticipatory Bail",
    writ_petition: "Writ Petition",
    pil: "PIL",
    criminal_revision: "Criminal Revision",
    quashing_petition: "Quashing Petition",
    affidavit: "Affidavit",
    counter_affidavit: "Counter Affidavit",
    rejoinder: "Rejoinder",
    synopsis: "Synopsis",
    other: "Other",
};

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

export const draftsApi = {
    create: async (
        caseId: string,
        data: {
            draft_type: DraftType;
            title?: string;
            additional_instructions?: string;
        },
    ) => {
        const res = await apiClient.post<
            ApiResponse<{ draft: Draft }>
        >(`/cases/${caseId}/drafts`, data);

        return unwrap(res).draft;
    },

    list: async (caseId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ drafts: Draft[] }>
        >(`/cases/${caseId}/drafts`);

        return unwrap(res).drafts;
    },

    get: async (draftId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ draft: Draft }>
        >(`/drafts/${draftId}`);

        return unwrap(res).draft;
    },

    update: async (
        draftId: string,
        data: { content?: string; title?: string; status?: DraftStatus },
    ) => {
        const res = await apiClient.patch<
            ApiResponse<{ draft: Draft }>
        >(`/drafts/${draftId}`, data);

        return unwrap(res).draft;
    },

    review: async (
        draftId: string,
        data: { content: string; title?: string },
    ) => {
        const res = await apiClient.post<
            ApiResponse<{ draft: Draft }>
        >(`/drafts/${draftId}/review`, data);

        return unwrap(res).draft;
    },

    fork: async (draftId: string) => {
        const res = await apiClient.post<
            ApiResponse<{ draft: Draft }>
        >(`/drafts/${draftId}/version`);

        return unwrap(res).draft;
    },

    archive: async (draftId: string) => {
        await apiClient.delete<ApiResponse<Record<string, never>>>(
            `/drafts/${draftId}`,
        );
        return true;
    },

    // ------------------------------------------------------------
    // SSE STREAM (SAFE WRAPPER)
    // ------------------------------------------------------------

    stream: (draftId: string) => {
        const token = getAccessToken();
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
        const baseUrl = API_BASE.endsWith('/api/v1') ? API_BASE.slice(0, -7) : API_BASE;
        const url = `${baseUrl}/api/v1/drafts/${draftId}/stream?token=${token}`;

        const es = new EventSource(url);

        return {
            eventSource: es,

            onMessage: (cb: (data: string) => void) => {
                es.onmessage = (e) => cb(e.data);
            },

            onError: (cb: (err: Event) => void) => {
                es.onerror = cb;
            },

            close: () => {
                es.close();
            },
        };
    },

    // ------------------------------------------------------------
    // EXPORT
    // ------------------------------------------------------------

    triggerExport: async (draftId: string, format: "pdf" | "docx") => {
        const res = await apiClient.post<
            ApiResponse<{ job_id: string; export_id: string }>
        >(`/drafts/${draftId}/export`, { format });

        return unwrap(res);
    },

    getExport: async (exportId: string) => {
        const res = await apiClient.get<
            ApiResponse<{
                export: {
                    id: string;
                    draft_id: string;
                    export_format: "pdf" | "docx";
                    r2_key: string;
                    file_size_bytes: number | null;
                    expires_at: string | null;
                    created_at: string;
                };
            }>
        >(`/exports/${exportId}`);

        return unwrap(res).export;
    },

    getExportDownload: async (exportId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ url: string; expires_at: string }>
        >(`/exports/${exportId}/download`);

        return unwrap(res);
    },
};

// ------------------------------------------------------------
// JOB POLLING (REUSE)
// ------------------------------------------------------------

export async function pollExportJob(
    jobId: string,
    interval = 2000,
    timeout = 60000,
) {
    const start = Date.now();

    while (true) {
        const res = await apiClient.get<
            ApiResponse<{
                status: "pending" | "processing" | "completed" | "failed";
            }>
        >(`/jobs/${jobId}`);

        const data = unwrap(res);

        if (data.status === "completed" || data.status === "failed") {
            return data;
        }

        if (Date.now() - start > timeout) {
            throw new Error("Export polling timeout");
        }

        await new Promise((r) => setTimeout(r, interval));
    }
}
