"use client";

import { useParams } from "next/navigation";
import { Bail483DraftWorkspace } from "@/features/drafts/Bail483DraftWorkspace";

export default function Bail483DraftPage() {
    const { id } = useParams<{ id: string }>();
    return <Bail483DraftWorkspace caseId={id} />;
}
