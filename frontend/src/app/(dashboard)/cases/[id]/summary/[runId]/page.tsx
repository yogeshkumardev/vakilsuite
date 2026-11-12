"use client";

import { useParams } from "next/navigation";
import { SummaryReviewWorkspace } from "@/features/summaries/SummaryReviewWorkspace";

export default function SummaryReviewPage() {
    const { id: caseId, runId } = useParams<{ id: string; runId: string }>();
    return <SummaryReviewWorkspace caseId={caseId} runId={runId} />;
}
