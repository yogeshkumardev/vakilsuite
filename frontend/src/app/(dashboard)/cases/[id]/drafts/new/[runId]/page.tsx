"use client";
import { useParams } from "next/navigation";
import { OkfExportWorkspace } from "@/features/okf-exports/OkfExportWorkspace";
export default function DraftPreparationPage() {
    const { id, runId } = useParams<{ id: string; runId: string }>();
    return <OkfExportWorkspace caseId={id} runId={runId} />;
}
