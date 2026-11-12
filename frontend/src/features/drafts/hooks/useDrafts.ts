"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { draftsApi, DraftType, DraftStatus } from "@/lib/api/drafts";

export const draftKeys = {
    list: (caseId: string) => ["drafts", "list", caseId] as const,
    detail: (draftId: string) => ["drafts", "detail", draftId] as const,
};

export function useDraftList(caseId: string) {
    return useQuery({
        queryKey: draftKeys.list(caseId),
        queryFn: () => draftsApi.list(caseId),
        enabled: !!caseId,
        // draftsApi.list already returns Draft[] (unwrapped) — no select needed
    });
}

export function useDraft(draftId: string) {
    return useQuery({
        queryKey: draftKeys.detail(draftId),
        queryFn: () => draftsApi.get(draftId),
        enabled: !!draftId,
        // draftsApi.get already returns Draft (unwrapped) — no select needed
    });
}

export function useCreateDraft(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            draft_type: DraftType;
            title?: string;
            additional_instructions?: string;
        }) => draftsApi.create(caseId, data),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: draftKeys.list(caseId) }),
    });
}

export function useUpdateDraft(draftId: string, caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: {
            content?: string;
            title?: string;
            status?: DraftStatus;
        }) => draftsApi.update(draftId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: draftKeys.detail(draftId) });
            qc.invalidateQueries({ queryKey: draftKeys.list(caseId) });
        },
    });
}

export function useReviewDraft(draftId: string, caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data: { content: string; title?: string }) =>
            draftsApi.review(draftId, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: draftKeys.detail(draftId) });
            qc.invalidateQueries({ queryKey: draftKeys.list(caseId) });
        },
    });
}

export function useForkDraft(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draftId: string) => draftsApi.fork(draftId),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: draftKeys.list(caseId) }),
    });
}

export function useArchiveDraft(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (draftId: string) => draftsApi.archive(draftId),
        onSuccess: () =>
            qc.invalidateQueries({ queryKey: draftKeys.list(caseId) }),
    });
}
