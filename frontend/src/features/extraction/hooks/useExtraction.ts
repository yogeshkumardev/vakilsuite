"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { extractionApi, ReviewStatus } from "@/lib/api/extraction";
import { ApiClientError } from "@/lib/api/client";

export const extractionKeys = {
    all: ["extraction"] as const,
    result: (documentId: string) =>
        [...extractionKeys.all, "result", documentId] as const,
};

export function useExtraction(documentId: string, enabled = true) {
    return useQuery({
        queryKey: extractionKeys.result(documentId),
        queryFn: async () => {
            try {
                return await extractionApi.getExtraction(documentId);
            } catch (error) {
                if (error instanceof ApiClientError && error.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        enabled: !!documentId && enabled,
        staleTime: 0,
        refetchInterval: (query) => {
            const status = query.state.data?.extraction_status;
            // Poll every 3s while Celery task is running
            return status === "processing" || status === "pending" ? 3000 : false;
        },
    });
}

export function useReviewExtraction(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({
            extractionId,
            extracted_fields,
            review_status,
            formatted_content,
        }: {
            extractionId: string;
            extracted_fields: Record<string, unknown>;
            review_status: ReviewStatus;
            formatted_content?: string;
        }) =>
            extractionApi.reviewExtraction(extractionId, {
                extracted_fields,
                review_status,
                formatted_content,
            }),
        onSuccess: (updated) => {
            qc.setQueryData(extractionKeys.result(documentId), updated);
        },
    });
}
// Auto-save formatted_content without changing review_status
export function useSaveExtractionContent(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (formatted_content: string) => {
            const current = qc.getQueryData<ReturnType<typeof extractionApi.getExtraction> extends Promise<infer T> ? T : never>(
                extractionKeys.result(documentId),
            );
            // We need the extraction to get its id and current fields
            const extraction = current as Awaited<ReturnType<typeof extractionApi.getExtraction>>;
            if (!extraction) throw new Error("Extraction not loaded");
            return extractionApi.reviewExtraction(extraction.id, {
                extracted_fields: extraction.extracted_fields,
                review_status: extraction.review_status,
                formatted_content,
            });
        },
        onSuccess: (updated) => {
            qc.setQueryData(extractionKeys.result(documentId), updated);
        },
    });
}

export function useRetryExtraction(documentId: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => extractionApi.retryExtraction(documentId),
        onSuccess: () => {
            qc.invalidateQueries({
                queryKey: extractionKeys.result(documentId),
            });
        },
    });
}
