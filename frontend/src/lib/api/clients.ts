import { apiClient } from "./client";

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };
export type Client = { id: string; full_name: string; phone: string | null; email: string | null; notes: string | null };

function unwrap<T>(response: Envelope<T>): T {
  if (!response.success) throw new Error(response.error.message);
  return response.data;
}

export const clientsApi = {
  list: async (search = "") => unwrap(await apiClient.get<Envelope<Client[]>>(`/clients?search=${encodeURIComponent(search)}`)),
  create: async (input: { full_name: string; phone?: string; email?: string; notes?: string }) => unwrap(await apiClient.post<Envelope<Client>>("/clients", input)),
  createPreFilingMatter: async (input: { matter_title: string; notes?: string }) => unwrap(await apiClient.post<Envelope<{ id: string; matter_title: string; matter_phase: string }>>("/matters", input)),
};

export const feesApi = {
  ledger: async (matterId: string) => unwrap(await apiClient.get<Envelope<{ agreement: { id: string; agreed_amount_paise: number }; collected_paise: number; outstanding_paise: number; entries: Array<{ id: string; entry_type: string; amount_paise: number; created_at: string }> }>>(`/matters/${matterId}/fee-ledger`)),
  agreement: async (matterId: string, agreed_amount_paise: number) => unwrap(await apiClient.post<Envelope<{ id: string }>>(`/matters/${matterId}/fee-agreements`, { agreed_amount_paise })),
  post: async (matterId: string, agreementId: string, entry_type: string, amount_paise: number) => unwrap(await apiClient.post<Envelope<unknown>>(`/matters/${matterId}/fee-agreements/${agreementId}/entries`, { entry_type, amount_paise, idempotency_key: crypto.randomUUID() })),
};

export const matterClientsApi = {
  list: async (matterId: string) => unwrap(await apiClient.get<Envelope<Array<{ client_id: string; role: string; client: Client }>>>(`/cases/${matterId}/clients`)),
  link: async (matterId: string, client_id: string) => unwrap(await apiClient.post<Envelope<unknown>>(`/cases/${matterId}/clients`, { client_id, role: "client" })),
  unlink: async (matterId: string, clientId: string) => unwrap(await apiClient.delete<Envelope<unknown>>(`/cases/${matterId}/clients/${clientId}`)),
};
