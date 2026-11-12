"use client";

import { useParams } from "next/navigation";
import { SummaryPreparationWorkspace } from "@/features/summaries/SummaryPreparationWorkspace";

export default function SummaryPreparationPage() {
    const { id: caseId } = useParams<{ id: string }>();
    return <SummaryPreparationWorkspace caseId={caseId} />;
}
