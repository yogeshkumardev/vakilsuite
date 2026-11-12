import { apiClient } from "@/lib/api/client";
import { Document } from "@/types/api";
import type { components } from "@/types/generated-api";

export async function listDocuments(caseId: string) {
  return apiClient.get<{ documents: Document[] }>(`/cases/${caseId}/documents`);
}

export async function presignDocument(
  caseId: string,
  payload: components["schemas"]["PresignUploadRequest"],
) {
  return apiClient.post<components["schemas"]["PresignUploadResponse"]>(`/cases/${caseId}/documents/presign`, payload);
}

export async function confirmUpload(documentId: string) {
  return apiClient.post<components["schemas"]["ConfirmUploadResponse"]>(
    `/documents/${documentId}/confirm-upload`,
    {},
  );
}

export async function getDocumentViewUrl(documentId: string) {
  return apiClient.get<components["schemas"]["ViewUrlResponse"]>(`/documents/${documentId}/view-url`);
}
