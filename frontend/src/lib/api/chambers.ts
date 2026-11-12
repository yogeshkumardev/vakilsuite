import { apiClient } from "@/lib/api/client";
import type { ApiResponse } from "@/types/api";
import type { ChamberRole } from "@/store/chamber.store";

export interface ChamberMembership {
  id: string;
  chamber_id: string;
  user_id: string;
  role: ChamberRole;
  status: "active" | "revoked";
  joined_at: string;
  revoked_at: string | null;
}

export interface Chamber {
  id: string;
  name: string;
  slug: string;
  owner_user_id: string;
  created_at: string;
  membership: ChamberMembership;
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success) throw new Error(response.error.message);
  return response.data;
}

export const chambersApi = {
  list: async () => unwrap(await apiClient.get<ApiResponse<Chamber[]>>("/chambers")),
  listMembers: async (chamberId: string) =>
    unwrap(await apiClient.get<ApiResponse<ChamberMembership[]>>(`/chambers/${chamberId}/members`)),
  addMember: (chamberId: string, userId: string, role: ChamberRole) =>
    apiClient.post<ApiResponse<ChamberMembership>>(`/chambers/${chamberId}/members`, { user_id: userId, role }).then(unwrap),
  updateMember: (chamberId: string, membershipId: string, payload: { role?: ChamberRole; revoke?: boolean }) =>
    apiClient.patch<ApiResponse<ChamberMembership>>(`/chambers/${chamberId}/members/${membershipId}`, payload).then(unwrap),
};
