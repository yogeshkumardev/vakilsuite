"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { courtroomApi, type SessionType } from "@/lib/api/courtroom";

export const courtroomKeys = {
    sessions: (caseId: string) => ["courtroom", "sessions", caseId] as const,
    session:  (sessionId: string) => ["courtroom", "session", sessionId] as const,
};

export function useCourtroomSessions(caseId: string) {
    return useQuery({
        queryKey: courtroomKeys.sessions(caseId),
        queryFn:  () => courtroomApi.listSessions(caseId),
        enabled:  !!caseId,
    });
}

export function useCourtroomSession(sessionId: string) {
    return useQuery({
        queryKey: courtroomKeys.session(sessionId),
        queryFn:  () => courtroomApi.getSession(sessionId),
        enabled:  !!sessionId,
    });
}

export function useCreateCourtroomSession(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { session_type: SessionType; title?: string }) =>
            courtroomApi.createSession(caseId, data),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: courtroomKeys.sessions(caseId) }),
    });
}

export function useEndCourtroomSession(caseId: string, sessionId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => courtroomApi.endSession(sessionId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: courtroomKeys.sessions(caseId) });
            qc.invalidateQueries({ queryKey: courtroomKeys.session(sessionId) });
        },
    });
}
