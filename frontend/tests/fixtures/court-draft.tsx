"use client";

import { QueryProvider } from "@/components/shared/QueryProvider";
import { Bail483DraftWorkspace } from "@/features/drafts/Bail483DraftWorkspace";

export default function CourtDraftSmokeFixture() {
    return <QueryProvider><Bail483DraftWorkspace caseId="11111111-1111-4111-8111-111111111111" summaryRunId="22222222-2222-4222-8222-222222222222" /></QueryProvider>;
}
