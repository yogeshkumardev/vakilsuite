import { apiClient } from "./client";

export async function createPreFilingMatter(matter_title: string, notes?: string) {
  const response = await apiClient.post<{ success: true; data: { id: string } }>("/matters", { matter_title, notes });
  return response.data;
}

export async function listClients(search = "") {
  const response = await apiClient.get<{ success: true; data: { id: string; full_name: string }[] }>(`/clients?search=${encodeURIComponent(search)}`);
  return response.data;
}

export async function createClient(full_name: string) {
  const response = await apiClient.post<{ success: true; data: { id: string; full_name: string } }>("/clients", { full_name });
  return response.data;
}

export async function listMatterClients(matterId: string) {
  const response = await apiClient.get<{ success: true; data: { client_id: string; client: { full_name: string } }[] }>(`/cases/${matterId}/clients`);
  return response.data;
}

export async function linkMatterClient(matterId: string, client_id: string) {
  await apiClient.post(`/cases/${matterId}/clients`, { client_id, role: "client" });
}

export async function getFeeLedger(matterId: string) {
  const response = await apiClient.get<{ success: true; data: { agreement: { id: string; agreed_amount_paise: number }; collected_paise: number; outstanding_paise: number } }>(`/matters/${matterId}/fee-ledger`);
  return response.data;
}

export async function createFeeAgreement(matterId: string, agreed_amount_paise: number) {
  const response = await apiClient.post<{ success: true; data: { id: string } }>(`/matters/${matterId}/fee-agreements`, { agreed_amount_paise });
  return response.data;
}
