import { ApiResponse } from "@/types/api";
import { apiClient, getAccessToken } from "./client";

// ------------------------------------------------------------
// TYPES
// ------------------------------------------------------------

export type SessionType = "opposing_counsel" | "judge";
export type SessionStatus = "active" | "completed" | "archived";

export interface Message {
    role: "lawyer" | "ai";
    content: string;
    timestamp: string;
}

export interface WeakPoint {
    point: string;
    suggestion: string;
    identified_at: string;
}

export interface CourtroomSession {
    id: string;
    case_id: string;
    lawyer_id: string;
    session_type: SessionType;
    title: string | null;
    messages: Message[];
    weak_points_identified: WeakPoint[];
    turn_count: number;
    status: SessionStatus;
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

export const courtroomApi = {
    createSession: async (
        caseId: string,
        data: { session_type: SessionType; title?: string },
    ) => {
        const res = await apiClient.post<
            ApiResponse<{ session: CourtroomSession }>
        >(`/cases/${caseId}/courtroom-sessions`, data);

        return unwrap(res).session;
    },

    listSessions: async (caseId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ sessions: CourtroomSession[] }>
        >(`/cases/${caseId}/courtroom-sessions`);

        return unwrap(res).sessions;
    },

    getSession: async (sessionId: string) => {
        const res = await apiClient.get<
            ApiResponse<{ session: CourtroomSession }>
        >(`/courtroom-sessions/${sessionId}`);

        return unwrap(res).session;
    },

    endSession: async (sessionId: string) => {
        const res = await apiClient.post<
            ApiResponse<{ session: CourtroomSession; weak_points: WeakPoint[] }>
        >(`/courtroom-sessions/${sessionId}/end`, {});

        return unwrap(res);
    },

    // ------------------------------------------------------------
    // SSE STREAM (ROBUST VERSION)
    // ------------------------------------------------------------

    streamMessage: async (
        sessionId: string,
        content: string,
        onMessage: (chunk: string) => void,
        onComplete: () => void,
        onError: (err: unknown) => void,
        signal?: AbortSignal,
    ) => {
        try {
            const token = getAccessToken();
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

            const response = await fetch(
                `${API_BASE}/courtroom-sessions/${sessionId}/message`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...(token && { Authorization: `Bearer ${token}` }),
                    },
                    body: JSON.stringify({ content }),
                    signal,
                },
            );

            if (!response.ok || !response.body) {
                throw new Error("Stream connection failed");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    onComplete();
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                let boundary = buffer.indexOf("\n\n");

                while (boundary !== -1) {
                    const chunk = buffer.slice(0, boundary);
                    buffer = buffer.slice(boundary + 2);

                    const lines = chunk.split("\n");

                    for (const line of lines) {
                        if (!line.startsWith("data:")) continue;

                        const dataStr = line.replace("data:", "").trim();

                        if (dataStr === "[DONE]") {
                            onComplete();
                            return;
                        }

                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) {
                                onMessage(parsed.text);
                            }
                        } catch {
                            // Ignore partial JSON safely
                        }
                    }

                    boundary = buffer.indexOf("\n\n");
                }
            }
        } catch (err) {
            onError(err);
        }
    },
};