import { ApiResponse } from "@/types/api";
import { apiClient } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export interface Notification {
    id: string;
    user_id: string;
    notification_type: string;
    title: string;
    message: string | null;
    is_read: boolean;
    link: string | null;
    created_at: string;
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

export const notificationsApi = {
    getAll: async () => {
        const res = await apiClient.get<
            ApiResponse<{
                notifications: Notification[];
                unread_count: number;
            }>
        >("/notifications");

        return unwrap(res);
    },

    markRead: async (id: string) => {
        await apiClient.patch<ApiResponse<Record<string, never>>>(
            `/notifications/${id}/read`,
        );
        return true;
    },

    markAllRead: async () => {
        await apiClient.patch<ApiResponse<Record<string, never>>>(
            "/notifications/read-all",
        );
        return true;
    },
};