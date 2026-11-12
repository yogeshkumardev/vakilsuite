"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { QueryProvider } from "@/components/shared/QueryProvider";
import { useAuthStore } from "@/store/auth.store";
import { usePathname, useRouter } from "next/navigation";
import { isDeferredPage } from "@/lib/feature-availability";
import { FeatureUnavailable } from "@/components/shared/FeatureUnavailable";
import { useEffect, useState } from "react";
import { authApi, restoreWebSession } from "@/lib/api/auth";
import { ApiClientError } from "@/lib/api/client";

const SIDEBAR_STORAGE_KEY = "vakilsuite-sidebar-collapsed";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isHydrated, user } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
    const [sessionError, setSessionError] = useState<string | null>(null);

    useEffect(() => {
        try { window.localStorage.removeItem("auth-storage"); } catch { /* Storage can be disabled. */ }
        let active = true;
        const handleFailure = (error: unknown) => {
            if (error instanceof ApiClientError && [401, 403].includes(error.status)) useAuthStore.getState().clearAuth();
            else if (active) setSessionError("Cannot reach the server. Check your connection and retry.");
        };
        void restoreWebSession().catch(handleFailure);
        const revalidate = async () => {
            if (document.visibilityState !== "visible" || !useAuthStore.getState().user) return;
            try {
                const current = await authApi.me();
                const token = useAuthStore.getState().accessToken;
                if (token) useAuthStore.getState().setAuth(current, token);
                if (active) setSessionError(null);
            } catch (error) { handleFailure(error); }
        };
        window.addEventListener("focus", revalidate);
        const interval = window.setInterval(revalidate, 30000);
        return () => { active = false; clearInterval(interval); window.removeEventListener("focus", revalidate); };
    }, []);

    useEffect(() => {
        if (isHydrated && !user) router.replace("/login");
    }, [isHydrated, user, router]);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => {
            setSidebarCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "true");
        });
        return () => window.cancelAnimationFrame(frame);
    }, []);

    const toggleSidebar = () => {
        setSidebarCollapsed((current) => {
            const next = !current;
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
            return next;
        });
    };

    return (
        <QueryProvider>
            {(!isHydrated || !user) ? (
                <div className="flex h-screen items-center justify-center bg-background">
                    {sessionError ? <div className="max-w-sm space-y-4 p-6"><p role="alert">{sessionError}</p><button className="text-emerald-700 underline" onClick={() => window.location.reload()}>Try again</button></div> : <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />}
                </div>
            ) : (
                <div className="flex h-dvh overflow-hidden bg-slate-50">
                    <Sidebar
                        collapsed={sidebarCollapsed}
                        mobileOpen={mobileNavigationOpen}
                        onToggleCollapsed={toggleSidebar}
                        onCloseMobile={() => setMobileNavigationOpen(false)}
                    />
                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                        <Header onOpenNavigation={() => setMobileNavigationOpen(true)} />
                        <main className="flex-1 overflow-auto">{isDeferredPage(pathname) ? <FeatureUnavailable /> : children}</main>
                    </div>
                </div>
            )}
        </QueryProvider>
    );
}
