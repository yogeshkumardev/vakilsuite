import { apiClient } from "@/lib/api/client";
import { unwrapApi, type ApiResponse } from "@/types/api";
import type { TypedRevision } from "@/lib/api/documents";

export type Box = [number, number, number, number];
export interface EvidenceCell {
    row: number;
    column: number;
    rowspan: number;
    colspan: number;
    bbox: Box;
    text: string;
    evidence_ids: string[];
}
export interface EvidenceBlock {
    id: string;
    kind: "table" | "field" | "paragraph" | "heading" | "unknown";
    bbox: Box;
    text: string;
    label: string | null;
    value: string | null;
    presence: string;
    rows: number;
    columns: number;
    cells: EvidenceCell[];
    warnings: string[];
    evidence_ids: string[];
}
export interface EvidencePage {
    number: number;
    width: number;
    height: number;
    blocks: EvidenceBlock[];
    warnings: string[];
}
export interface EvidenceResult {
    revision: null | {
        id: string;
        content_hash: string;
        stale: boolean;
        structure: {
            schema_version: 5;
            pages: EvidencePage[];
            source_hash: string;
        };
    };
    coverage: {
        can_query: boolean;
        status?: string;
        unresolved_pages?: number[];
        queryable_pages?: number[];
        total_pages?: number;
        can_create_typed_copy: boolean;
        can_prepare_evidence_snapshot: boolean;
        excluded_lines?: number;
        pages?: {
            number: number;
            status: string;
            warnings: string[];
            excluded_lines: number;
        }[];
    };
    outcome?: {
        status: string;
        code: string;
        message: string;
        verified: false;
    } | null;
    processing?: { active: boolean; error?: string | null };
}
export interface EvidenceMatch {
    id: string;
    page: number;
    block_id: string;
    text: string;
    warnings: string[];
    bbox: Box;
}
export interface SearchResult {
    revision_id: string;
    matches: EvidenceMatch[];
    truncated: boolean;
    message: string;
}

export const understandingApi = {
    get: async (id: string) =>
        unwrapApi(
            await apiClient.get<ApiResponse<EvidenceResult>>(
                `/documents/${id}/understanding`,
            ),
        ),
    search: async (id: string, revisionId: string, query: string) =>
        unwrapApi(
            await apiClient.post<ApiResponse<SearchResult>>(
                `/documents/${id}/evidence-search`,
                { revision_id: revisionId, query },
            ),
        ),
    snapshot: async (caseId: string, ids: string[]) =>
        unwrapApi(
            await apiClient.post<ApiResponse<Record<string, unknown>>>(
                `/cases/${caseId}/evidence-snapshot`,
                { document_ids: ids },
            ),
        ),
    typedCopy: async (
        id: string,
        revisionId: string,
        parent?: TypedRevision | null,
    ) =>
        unwrapApi(
            await apiClient.post<ApiResponse<{ typed_revision_id: string }>>(
                `/documents/${id}/understanding/typed-copy`,
                {
                    revision_id: revisionId,
                    parent_revision_id: parent?.id ?? null,
                    parent_lock_version: parent?.lock_version ?? null,
                    parent_content_hash: parent?.content_hash ?? null,
                },
            ),
        ),
};
