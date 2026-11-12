"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { useAuthStore } from "@/store/auth.store";
import { useChamberStore } from "@/store/chamber.store";
import { cancelScopedRequests } from "@/lib/api/client";

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        refetchOnWindowFocus: "always",
                        retry: (failureCount, error: unknown) => {
                            const status = (error as { status?: number })
                                ?.status;
                            if (status && [401, 403, 404].includes(status))
                                return false;
                            return failureCount < 2;
                        },
                    },
                },
            }),
    );

    useEffect(() => {
        const clearScopedClientState = () => {
            cancelScopedRequests();
            void queryClient.cancelQueries();
            queryClient.clear();
        };
        const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
            if (state.user?.id !== previous.user?.id) clearScopedClientState();
        });
        const unsubscribeChamber = useChamberStore.subscribe((state, previous) => {
            if (state.selected?.id !== previous.selected?.id) clearScopedClientState();
        });
        return () => { unsubscribeAuth(); unsubscribeChamber(); };
    }, [queryClient]);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
