import { apiClient } from "@/lib/api/client";

export type ChamberRole = "owner" | "admin" | "staff" | "reviewer";
export type Chamber = { id: string; name: string; slug: string; owner_user_id: string; membership: { id: string; user_id: string; role: ChamberRole; status: "active" | "revoked" } };
export type ChamberMember = { id: string; user_id: string; role: ChamberRole; status: "active" | "revoked" };

export const chambersApi = {
  list: () => apiClient.get<Chamber[]>("/chambers"),
  members: (chamberId: string) => apiClient.get<ChamberMember[]>(`/chambers/${chamberId}/members`),
  add: (chamberId: string, userId: string, role: ChamberRole) => apiClient.post<ChamberMember>(`/chambers/${chamberId}/members`, { user_id: userId, role }),
  update: (chamberId: string, memberId: string, payload: { role?: ChamberRole; revoke?: boolean }) => apiClient.patch<ChamberMember>(`/chambers/${chamberId}/members/${memberId}`, payload),
};
