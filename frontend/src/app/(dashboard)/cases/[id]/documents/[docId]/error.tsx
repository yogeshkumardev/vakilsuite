"use client";
import { useParams } from "next/navigation";
import { PageError } from "@/components/shared/PageError";
export default function DocumentError({ error, reset, unstable_retry }: { error: Error & { digest?: string }; reset: () => void; unstable_retry?: () => void }) {
    const { id } = useParams<{ id: string }>();
    return <PageError retry={unstable_retry ?? reset} title="Your document workspace paused" description="The editor couldn’t continue. Reopen the workspace to load the latest saved text and check its typing status." backHref={`/cases/${id}?tab=documents`} backLabel="Back to documents" digest={error.digest} />;
}
