"use client";
import { useParams } from "next/navigation";
import { CaseDraftsWorkspace } from "@/features/drafts/CaseDraftsWorkspace";
export default function DraftsPage() {
    const { id } = useParams<{ id: string }>();
    return <CaseDraftsWorkspace caseId={id} />;
}
