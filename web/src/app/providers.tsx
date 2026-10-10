"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, type ReactNode } from "react";
import { getQueryClient } from "@/lib/getQueryClient";
import { usePlannerStore } from "@/store/plannerStore";
import { useShoppingStore } from "@/store/shoppingStore";

export function Providers({ children }: { children: ReactNode }) {
    const queryClient = getQueryClient();

    // Load persisted Zustand state after the first client render (see skipHydration).
    useEffect(() => {
        void usePlannerStore.persist.rehydrate();
        void useShoppingStore.persist.rehydrate();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
        </QueryClientProvider>
    );
}
