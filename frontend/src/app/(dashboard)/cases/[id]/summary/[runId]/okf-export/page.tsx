"use client";

import { useParams } from "next/navigation";
import { OkfExportWorkspace } from "@/features/okf-exports/OkfExportWorkspace";

export default function OkfExportPage() {
    const { id: caseId, runId } = useParams<{ id: string; runId: string }>();
    return <OkfExportWorkspace caseId={caseId} runId={runId} />;
}
