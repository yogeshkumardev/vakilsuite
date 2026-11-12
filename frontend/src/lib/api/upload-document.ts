import { documentsApi, uploadFileToR2 } from "./documents";
import type { DocumentType } from "@/types/api";
import type { components } from "@/types/generated-api";

// One ID per user-selected file, reused through presign/transfer/confirm retries.
// Kept in memory, never in localStorage with confidential document metadata.
export interface UploadAttempt {
    id: string;
    caseId: string;
    file: File;
    documentType: DocumentType;
    origin: components["schemas"]["FileOrigin"];
    documentId?: string;
    stored?: boolean;
}

export async function completeUpload(
    attempt: UploadAttempt,
    isCurrent: () => boolean,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
): Promise<string> {
    const check = () => {
        if (!isCurrent() || signal?.aborted) throw new Error("Upload stopped because the session or page changed.");
    };
    check();
    if (!attempt.stored) {
        const result = await documentsApi.presign(attempt.caseId, {
            client_upload_id: attempt.id,
            filename: attempt.file.name,
            mime_type: attempt.file.type,
            file_size_bytes: attempt.file.size,
            document_type: attempt.documentType,
            origin: attempt.origin,
        });
        check();
        attempt.documentId = result.document_id;
        if (!result.already_uploaded) {
            await uploadFileToR2(result.upload_url, attempt.file, onProgress, signal);
            check();
        }
        attempt.stored = true;
    }
    check();
    await documentsApi.confirmUpload(attempt.documentId!);
    check();
    return attempt.documentId!;
}
