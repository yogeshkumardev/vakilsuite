"use client";

import { useParams } from "next/navigation";
import { WorkingDocumentWorkspace } from "@/features/working-documents/WorkingDocumentWorkspace";

export default function WorkingDocumentPage() {
    const { id, documentId } = useParams<{ id: string; documentId: string }>();
    return <WorkingDocumentWorkspace caseId={id} workingDocumentId={documentId} />;
}
