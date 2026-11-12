"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InformationView } from "@/features/documents/understanding/InformationView";

export default function UnderstandingFixture() {
    const [client] = useState(
        () =>
            new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    );
    const [typed, setTyped] = useState(false);
    return (
        <QueryClientProvider client={client}>
            <main
                style={{ height: "100dvh", maxWidth: 1400, margin: "0 auto" }}
            >
                {typed ? (
                    <p role="status">Typed copy ready</p>
                ) : (
                    <InformationView
                        documentId="document"
                        caseId="case"
                        onTypedReady={() => setTyped(true)}
                    />
                )}
            </main>
        </QueryClientProvider>
    );
}
