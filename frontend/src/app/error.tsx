"use client";
import { PageError } from "@/components/shared/PageError";
export default function RootError({ error, reset, unstable_retry }: { error: Error & { digest?: string }; reset: () => void; unstable_retry?: () => void }) {
    return <PageError retry={unstable_retry ?? reset} digest={error.digest} />;
}
