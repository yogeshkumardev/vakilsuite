import { apiClient } from "@/lib/api/client";

export type EditorBootstrap = { session_id: string; token: string; expires_at: string };
export type WorkingDocumentSummary = {
  id: string;
  title: string;
  latest_revision_number: number | null;
};

export async function createEditorBootstrap(documentId: string): Promise<EditorBootstrap> {
  return apiClient.post<EditorBootstrap>(`/working-documents/${documentId}/editor-bootstrap`);
}

export async function listWorkingDocuments(caseId: string): Promise<WorkingDocumentSummary[]> {
  return apiClient.get<WorkingDocumentSummary[]>(`/cases/${caseId}/working-documents`);
}
