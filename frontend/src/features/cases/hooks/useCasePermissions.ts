"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { components } from "@/types/generated-api";

export function useCasePermissions(caseId: string) {
    return useQuery({
        queryKey: ["case-permissions", caseId],
        enabled: Boolean(caseId),
        queryFn: async () => {
            const result = await apiClient.get<ApiResponse<components["schemas"]["PermissionsData"]>>(`/cases/${caseId}/permissions`);
            if (!result.success) throw new Error(result.error.message);
            return result.data;
        },
        refetchInterval: 15000,
    });
}
