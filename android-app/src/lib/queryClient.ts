import { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10000,
      refetchOnWindowFocus: "always",
      retry: (count, error) => ![401, 403, 404].includes((error as { status?: number }).status ?? 0) && count < 1,
    },
    mutations: { retry: false },
  },
});

useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id || state.chamberId !== previous.chamberId) {
    void queryClient.cancelQueries();
    queryClient.clear();
  }
});
