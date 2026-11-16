"use client";
import { useParams } from "next/navigation";
import { Bail483DraftWorkspace } from "@/features/drafts/Bail483DraftWorkspace";

export default function DraftPreparationPage() {
    const { id, runId } = useParams<{ id: string; runId: string }>();
    return <Bail483DraftWorkspace caseId={id} summaryRunId={runId} />;
}
