"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contextApi } from "@/lib/api/context";

export const contextKeys = {
    context:   (caseId: string) => ["context", caseId] as const,
    summary:   (caseId: string) => ["summary", caseId] as const,
    readiness: (caseId: string) => ["documents-readiness", caseId] as const,
};

export function useCaseContext(caseId: string) {
    return useQuery({
        queryKey: contextKeys.context(caseId),
        queryFn: () => contextApi.getContext(caseId),
        enabled: !!caseId,
    });
}

export function useCaseSummary(caseId: string) {
    return useQuery({
        queryKey: contextKeys.summary(caseId),
        queryFn: () => contextApi.getSummary(caseId),
        enabled: !!caseId,
        retry: false, // 404 expected when no summary yet
    });
}

export function useClearContext(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => contextApi.clearContext(caseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: contextKeys.context(caseId) });
            qc.invalidateQueries({ queryKey: contextKeys.summary(caseId) });
        },
    });
}

export function useRegenerateSummary(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => contextApi.regenerateSummary(caseId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: contextKeys.summary(caseId) });
        },
    });
}

export function useUpdateContextDocument(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ documentId, htmlContent }: { documentId: string; htmlContent: string }) =>
            contextApi.updateContextDocument(caseId, documentId, htmlContent),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: contextKeys.context(caseId) });
            // Summary may be stale now
            qc.invalidateQueries({ queryKey: contextKeys.summary(caseId) });
        },
    });
}

// Polls every 30s — readiness changes only when user completes workflow steps
export function useDocumentsReadiness(caseId: string) {
    return useQuery({
        queryKey: contextKeys.readiness(caseId),
        queryFn:  () => contextApi.getDocumentsReadiness(caseId),
        enabled:  !!caseId,
        staleTime: 30_000,
        refetchInterval: 30_000,
    });
}
