"use client";

import { authApi } from "@/lib/api/auth";
import { ChamberSelector } from "@/components/chambers/ChamberSelector";
import { useAuthStore } from "@/store/auth.store";
import {
    BriefcaseBusiness,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronUp,
    FilePlus2,
    LayoutDashboard,
    LayoutPanelTop,
    LogOut,
    Files,
    Scale,
    UserRound,
    X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface SidebarProps {
    collapsed: boolean;
    mobileOpen: boolean;
    onToggleCollapsed: () => void;
    onCloseMobile: () => void;
}

const NAV_GROUPS = [
    {
        label: "Workspace",
        items: [
            { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        ],
    },
    {
        label: "Practice",
        items: [
            { href: "/cases", label: "Cases", icon: BriefcaseBusiness },
            { href: "/clients", label: "Clients", icon: UserRound },
            { href: "/cases/new", label: "New Case", icon: FilePlus2 },
            { href: "/matters/new", label: "New Matter", icon: FilePlus2 },
        ],
    },
    {
        label: "Account",
        items: [
            { href: "/profile", label: "Profile", icon: UserRound },
            { href: "/chambers", label: "Chamber", icon: BriefcaseBusiness },
        ],
    },
] as const;

const CASE_NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: LayoutPanelTop },
    { id: "documents", label: "Documents", icon: Files },
    { id: "summary", label: "Case Summary", icon: Files },
    { id: "drafts", label: "Drafts", icon: FilePlus2 },
] as const;

function getCurrentCaseId(pathname: string) {
    const segments = pathname.split("/").filter(Boolean);
    if (segments[0] !== "cases" || !segments[1] || segments[1] === "new") return null;
    return segments[1];
}

function getCurrentCaseTab(pathname: string, tab: string | null) {
    if (pathname.includes("/drafts") || pathname.includes("/okf-export")) return "drafts";
    if (pathname.includes("/summary")) return "summary";
    if (pathname.includes("/documents")) return "documents";
    if (pathname.includes("/context")) return "context";
    if (pathname.includes("/courtroom")) return "courtroom";
    return CASE_NAV_ITEMS.some((item) => item.id === tab) ? tab : "overview";
}

function isItemActive(pathname: string, href: string) {
    if (href === "/") return pathname === "/";
    if (href === "/cases/new") return pathname === href;
    if (href === "/cases" && pathname === "/cases/new") return false;
    return pathname === href || pathname.startsWith(`${href}/`);
}

function getUserInitial(name?: string | null) {
    const trimmed = name?.trim();
    return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}

function getUserRoleLabel(role?: string | null) {
    return role ? role.replace(/_/g, " ") : "User";
}

export function Sidebar({
    collapsed,
    mobileOpen,
    onToggleCollapsed,
    onCloseMobile,
}: SidebarProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const [logoutError, setLogoutError] = useState<string | null>(null);
    const [loggingOut, setLoggingOut] = useState(false);
    const [accountMenuOpen, setAccountMenuOpen] = useState(false);
    const currentCaseId = getCurrentCaseId(pathname);
    const currentCaseTab = getCurrentCaseTab(pathname, searchParams.get("tab"));
    const userInitial = getUserInitial(user?.full_name);
    const profileLabel = "Profile";

    const handleLogout = async () => {
        if (loggingOut) return;
        setLoggingOut(true);
        setLogoutError(null);
        try {
            await authApi.logout();
            router.push("/login");
        } catch {
            setLogoutError("Sign-out failed. Check your connection and retry.");
        } finally {
            setLoggingOut(false);
        }
    };

    const asideClass = [
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:relative md:z-20 md:translate-x-0 md:transition-[width]",
        mobileOpen ? "visible translate-x-0" : "invisible -translate-x-full md:visible",
        collapsed ? "md:w-[72px]" : "md:w-60",
    ].join(" ");

    return (
        <>
            {mobileOpen && (
                <button
                    type="button"
                    aria-label="Close navigation"
                    onClick={onCloseMobile}
                    className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[1px] md:hidden"
                />
            )}

            <aside className={asideClass} aria-label="Primary navigation">
                <div className="flex h-14 shrink-0 items-center border-b border-slate-100 px-3">
                    <Link
                        href="/"
                        onClick={onCloseMobile}
                        className={`min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1 text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${collapsed ? "flex md:hidden" : "flex"}`}
                        title={collapsed ? "VakilSuite" : undefined}
                    >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-900 text-white">
                            <Scale className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                            <span className="block truncate text-sm font-semibold">VakilSuite</span>
                            <span className="block text-[10px] text-slate-400">Legal workspace</span>
                        </span>
                    </Link>

                    <button
                        type="button"
                        onClick={onCloseMobile}
                        aria-label="Close navigation"
                        className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:hidden"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className={`hidden rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 md:inline-flex ${collapsed ? "mx-auto" : ""}`}
                    >
                        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </button>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                    {!collapsed && <ChamberSelector />}
                    <div className="space-y-5">
                        {NAV_GROUPS.map((group) => (
                            <section key={group.label} aria-label={group.label}>
                                <p className={`mb-1.5 px-2 text-[10px] font-semibold uppercase text-slate-400 ${collapsed ? "md:sr-only" : ""}`}>
                                    {group.label}
                                </p>
                                <div className="space-y-1">
                                    {group.items.filter((item) => user?.role !== "munshi" || item.href !== "/cases/new").map((item) => {
                                        const active = isItemActive(pathname, item.href);
                                        const Icon = item.icon;
                                        return (
                                            <div key={item.href}>
                                                <Link
                                                    href={item.href}
                                                    onClick={onCloseMobile}
                                                    aria-current={active ? "page" : undefined}
                                                    title={collapsed ? item.label : undefined}
                                                    className={`group flex h-10 items-center gap-3 rounded-md px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                                        active
                                                            ? "bg-slate-900 text-white"
                                                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                                                    } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                                                >
                                                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                                                    <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                                                </Link>

                                                {item.href === "/cases" && currentCaseId && (
                                                    <div className={`mt-1 space-y-0.5 ${collapsed ? "md:ml-0" : "ml-4 border-l border-slate-200 pl-2"}`}>
                                                        {CASE_NAV_ITEMS.map((caseItem) => {
                                                            const CaseIcon = caseItem.icon;
                                                            const caseActive = currentCaseTab === caseItem.id;
                                                            return (
                                                                <Link
                                                                    key={caseItem.id}
                                                                    href={["summary", "drafts"].includes(caseItem.id) ? `/cases/${currentCaseId}/${caseItem.id}` : `/cases/${currentCaseId}?tab=${caseItem.id}`}
                                                                    onClick={onCloseMobile}
                                                                    aria-current={caseActive ? "page" : undefined}
                                                                    title={collapsed ? caseItem.label : undefined}
                                                                    className={`flex min-h-9 items-center gap-2.5 rounded-md px-2 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                                                                        caseActive
                                                                            ? "bg-indigo-50 text-indigo-800"
                                                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                                    } ${collapsed ? "md:justify-center md:px-0" : ""}`}
                                                                >
                                                                    <CaseIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                                                                    <span className={collapsed ? "md:hidden" : ""}>{caseItem.label}</span>
                                                                </Link>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}
                    </div>
                </nav>

                <div className="relative shrink-0 border-t border-slate-200 bg-white p-3">
                    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-2.5 ${collapsed ? "md:border-0 md:bg-transparent md:p-0" : ""}`}>
                        <button
                            type="button"
                            onClick={() => setAccountMenuOpen((open) => !open)}
                            aria-expanded={accountMenuOpen}
                            aria-controls="account-menu"
                            title={collapsed ? "Account menu" : undefined}
                            className={`group flex w-full min-w-0 items-center gap-2.5 rounded-md p-1.5 text-left outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500 ${collapsed ? "md:h-9 md:w-9 md:justify-center md:p-0" : ""}`}
                        >
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200">
                                    {userInitial}
                                </span>
                                <span className={`min-w-0 ${collapsed ? "md:hidden" : ""}`}>
                                    <span className="block truncate text-sm font-semibold text-slate-900">
                                        {user?.full_name ?? "User"}
                                    </span>
                                    <span className="block truncate text-[11px] capitalize text-slate-500">
                                        {getUserRoleLabel(user?.role)} · {user?.email ?? "Account"}
                                    </span>
                                </span>
                                <span className={`ml-auto text-slate-400 ${collapsed ? "md:hidden" : ""}`} aria-hidden="true">
                                    {accountMenuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </span>
                        </button>

                        {accountMenuOpen && <div
                            id="account-menu"
                            role="menu"
                            className={`absolute bottom-full z-30 mb-2 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 ${collapsed ? "left-2 w-48 md:left-full md:bottom-0 md:ml-2 md:mb-0" : "left-3 right-3"}`}
                        >
                            <div className="grid gap-1">
                                <Link
                                    href="/profile"
                                    onClick={() => { setAccountMenuOpen(false); onCloseMobile(); }}
                                    title={collapsed ? profileLabel : undefined}
                                    className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500 ${collapsed ? "md:w-9 md:justify-center md:px-0" : ""}`}
                                >
                                    <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span className={collapsed ? "md:hidden" : ""}>{profileLabel}</span>
                                </Link>
                                <Link
                                    href="/chambers"
                                    onClick={() => { setAccountMenuOpen(false); onCloseMobile(); }}
                                    title={collapsed ? "Chamber" : undefined}
                                    className={`flex h-9 items-center gap-2 rounded-md px-2.5 text-xs font-medium text-slate-700 outline-none transition-colors hover:bg-white hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-indigo-500 ${collapsed ? "md:w-9 md:justify-center md:px-0" : ""}`}
                                >
                                    <BriefcaseBusiness className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    <span className={collapsed ? "md:hidden" : ""}>Chamber</span>
                                </Link>
                            </div>

                            <button
                                type="button"
                                disabled={loggingOut}
                                onClick={() => void handleLogout()}
                                title={collapsed ? "Logout" : undefined}
                                className="mt-1 flex h-9 w-full items-center gap-2 rounded-md px-2.5 text-xs font-medium text-slate-500 outline-none transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                <span className={collapsed ? "md:hidden" : ""}>{loggingOut ? "Signing out…" : "Sign out"}</span>
                            </button>
                            {logoutError && <p role="alert" className="mt-2 text-xs text-red-700">{logoutError}</p>}
                        </div>
                        }
                    </div>
                </div>
            </aside>
        </>
    );
}
