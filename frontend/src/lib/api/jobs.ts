import { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface JobStatus {
    job_id: string;
    task_name: string | null;
    status: "pending" | "processing" | "completed" | "failed";
    progress: number;
    error: string | null;
    result: Record<string, unknown> | null;
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
// API
// ------------------------------------------------------------

export const jobsApi = {
    getStatus: async (jobId: string) => {
        const res = await apiClient.get<ApiResponse<JobStatus>>(
            `/jobs/${jobId}`,
        );

        return unwrap(res);
    },
};

// ------------------------------------------------------------
// GLOBAL POLLING (VERY IMPORTANT)
// ------------------------------------------------------------

export async function pollJob(
    jobId: string,
    interval = 2000,
    timeout = 60000,
): Promise<JobStatus> {
    const start = Date.now();

    while (true) {
        const status = await jobsApi.getStatus(jobId);

        if (
            status.status === "completed" ||
            status.status === "failed"
        ) {
            return status;
        }

        if (Date.now() - start > timeout) {
            throw new Error("Job polling timeout");
        }

        await new Promise((r) => setTimeout(r, interval));
    }
}