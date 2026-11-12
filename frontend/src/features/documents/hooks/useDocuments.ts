"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsApi } from "@/lib/api/documents";
import { DocumentType } from "@/types/api";
import { LegacyDocument as Document } from "@/lib/api/documents";
import { ApiClientError } from "@/lib/api/client";

export const documentKeys = {
    all: ["documents"] as const,
    list: (caseId: string) => [...documentKeys.all, "list", caseId] as const,
    detail: (id: string) => [...documentKeys.all, "detail", id] as const,
    viewUrl: (id: string) => [...documentKeys.all, "view-url", id] as const,
    progress: (id: string) => [...documentKeys.all, "progress", id] as const,
    revision: (id: string) => [...documentKeys.all, "revision", id] as const,
};

export function useDocuments(caseId: string) {
    return useQuery({
        queryKey: documentKeys.list(caseId),
        queryFn: () => documentsApi.list(caseId),
        refetchInterval: 15000,
        enabled: !!caseId,
        staleTime: 30_000,
    });
}

export function useDocument(documentId: string) {
    return useQuery({
        queryKey: documentKeys.detail(documentId),
        queryFn: () => documentsApi.get(documentId),
        enabled: !!documentId,
    });
}

export function useDocumentViewUrl(documentId: string, enabled = false) {
    return useQuery({
        queryKey: documentKeys.viewUrl(documentId),
        queryFn: () => documentsApi.getViewUrl(documentId),
        enabled: !!documentId && enabled,
        // View URLs expire in 15 min — stale after 12 min
        staleTime: 720_000,
    });
}

export function useUpdateDocument(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            documentId,
            data,
        }: {
            documentId: string;
            data: { document_type?: DocumentType; display_name?: string };
        }) => documentsApi.update(documentId, data),
        onSuccess: (_, { documentId }) => {
            qc.invalidateQueries({ queryKey: documentKeys.list(caseId) });
            qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
    });
}

export function useDeleteDocument(caseId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (documentId: string) => documentsApi.delete(documentId),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: documentKeys.list(caseId) });
        },
    });
}

export function useConfirmUpload(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => documentsApi.confirmUpload(documentId),
        onSuccess: (result) => {
            qc.setQueryData(documentKeys.detail(documentId), result.document);
            qc.invalidateQueries({ queryKey: documentKeys.all });
        },
    });
}

export function useReprocessDocument(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => documentsApi.reprocess(documentId),
        onMutate: async () => {
            await qc.cancelQueries({ queryKey: documentKeys.detail(documentId) });
            const previous = qc.getQueryData<Document>(documentKeys.detail(documentId));
            qc.setQueryData(documentKeys.detail(documentId), (old: unknown) => {
                if (!old || typeof old !== "object") return old;
                return {
                    ...(old as Document),
                    processing_status: "processing",
                    processing_error: null,
                };
            });
            return { previous };
        },
        onSuccess: (jobId) => {
            qc.setQueryData(documentKeys.detail(documentId), (old: unknown) => {
                if (!old || typeof old !== "object") return old;
                return {
                    ...(old as Document),
                    processing_status: "processing",
                    processing_job_id: jobId,
                    processing_error: null,
                };
            });
        },
        onError: (error, _variables, context) => {
            const message =
                error instanceof Error
                    ? error.message
                    : "Local processing failed. Please retry.";
            qc.setQueryData(documentKeys.detail(documentId), (old: unknown) => {
                const base = old && typeof old === "object" ? old : context?.previous;
                if (!base || typeof base !== "object") return base;
                return {
                    ...(base as Document),
                    processing_status: "failed",
                    processing_error: message,
                };
            });
        },
        onSettled: () => {
            qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
            qc.invalidateQueries({ queryKey: documentKeys.all });
            qc.invalidateQueries({ queryKey: ["understanding", documentId] });
        },
    });
}

export function useRetryDocumentPage(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (pageNumber: number) => documentsApi.retryPage(documentId, pageNumber),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
            qc.invalidateQueries({ queryKey: documentKeys.progress(documentId) });
        },
    });
}

export function useProcessingProgress(documentId: string, enabled = true) {
    return useQuery({
        queryKey: documentKeys.progress(documentId),
        queryFn: () => documentsApi.getProcessingProgress(documentId),
        enabled: Boolean(documentId) && enabled,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            return status && !["ready_for_review", "approved", "failed"].includes(status)
                ? 2000
                : false;
        },
    });
}

export function useTypedRevision(documentId: string, enabled = true) {
    return useQuery({
        queryKey: documentKeys.revision(documentId),
        queryFn: async () => {
            try {
                return await documentsApi.getTypedRevision(documentId);
            } catch (error) {
                if (error instanceof ApiClientError && error.status === 404) return null;
                throw error;
            }
        },
        enabled: Boolean(documentId) && enabled,
        staleTime: 30_000,
    });
}

export function useSaveTypedRevision(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: {
            revision_id: string;
            lock_version: number;
            content_markdown: string;
        }) => documentsApi.saveTypedRevision(documentId, input),
        onSuccess: (revision) => {
            qc.setQueryData(documentKeys.revision(documentId), revision);
            qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
        },
    });
}

export function useApproveTypedRevision(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => documentsApi.approveTypedRevision(documentId),
        onSuccess: ({ revision }) => {
            qc.setQueryData(documentKeys.revision(documentId), revision);
            qc.invalidateQueries({ queryKey: documentKeys.detail(documentId) });
            qc.invalidateQueries({ queryKey: documentKeys.progress(documentId) });
        },
    });
}
