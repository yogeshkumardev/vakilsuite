import { useQuery } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { Screen } from "@/components/ui/Screen";
import { Action, Caption, Notice } from "@/components/auth/AuthUI";
import { apiClient } from "@/lib/api/client";

export function CaseEditGuard({ caseId, children }: { caseId: string; children: ReactNode }) {
  const permissions = useQuery({ queryKey: ["permissions", caseId], queryFn: () => apiClient.get<{ can_edit: boolean }>(`/cases/${caseId}/permissions`), refetchInterval: 15000, staleTime: 0 });
  if (permissions.isPending) return <Screen><Caption>Checking case access...</Caption></Screen>;
  if (permissions.error) return <Screen><Notice>{permissions.error.message}</Notice><Action onPress={() => void permissions.refetch()}>Try again</Action></Screen>;
  if (!permissions.data.can_edit) return <Screen><Notice>You have read-only access to this case.</Notice></Screen>;
  return children;
}
