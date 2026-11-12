"use client";

import { useCaseList } from "@/features/cases/hooks/useCases";
import { CASE_TYPE_LABELS } from "@/types/api";
import {
    ArrowRight,
    BriefcaseBusiness,
    FilePlus2,
} from "lucide-react";
import Link from "next/link";
import { PageHeader, SectionHeader } from "@/components/ui/PageHeader";
import { WorkspacePage } from "@/components/ui/WorkspacePage";
import { Surface } from "@/components/ui/Surface";
import { useAuthStore } from "@/store/auth.store";

const QUICK_ACTIONS = [
    {
        href: "/cases/new",
        label: "New case",
        description: "Create a case workspace",
        icon: FilePlus2,
        primary: true,
    },
    {
        href: "/cases",
        label: "Browse cases",
        description: "Open cases and original documents",
        icon: BriefcaseBusiness,
        primary: false,
    },
] as const;

function formatDate(value: string | null) {
    if (!value) return "Not scheduled";
    return new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

export default function DashboardPage() {
    const canCreate = useAuthStore((state) => state.user?.role !== "munshi");
    const { data, isLoading, isError } = useCaseList({ page: 1, limit: 5 });
    const cases = data?.cases ?? [];

    return (
        <WorkspacePage>
            <PageHeader
                title="Practice overview"
                description="Manage cases, upload documents and view original files."
                actions={
                <Link href="/cases" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-slate-950 sm:mt-0">
                    All cases
                    <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                }
                className="border-b border-slate-200 pb-5"
            />

            <section className="py-6" aria-labelledby="quick-actions-heading">
                <SectionHeader id="quick-actions-heading" title="Quick actions" className="uppercase text-slate-500" />
                <div className="grid gap-2 sm:grid-cols-2">
                    {QUICK_ACTIONS.filter((action) => canCreate || action.href !== "/cases/new").map((action) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={action.href}
                                href={action.href}
                                className={`group flex min-h-20 items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
                                    action.primary
                                        ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                                        : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                                }`}
                            >
                                <Icon className={`h-5 w-5 shrink-0 ${action.primary ? "text-white" : "text-slate-500"}`} />
                                <span className="min-w-0">
                                    <span className="block text-sm font-semibold">{action.label}</span>
                                    <span className={`mt-0.5 block text-xs ${action.primary ? "text-slate-300" : "text-slate-400"}`}>{action.description}</span>
                                </span>
                                <ArrowRight className={`ml-auto h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${action.primary ? "text-slate-300" : "text-slate-400"}`} />
                            </Link>
                        );
                    })}
                </div>
            </section>

            <div className="grid gap-6">
                <section aria-labelledby="recent-cases-heading">
                    <div className="mb-3 flex items-center justify-between">
                        <h2 id="recent-cases-heading" className="text-sm font-semibold text-slate-900">Recent cases</h2>
                        {data?.pagination ? <span className="text-xs text-slate-400">{data.pagination.total} total</span> : null}
                    </div>

                    <Surface className="overflow-hidden">
                        {isLoading && (
                            <div className="divide-y divide-slate-100">
                                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-[70px] animate-pulse bg-slate-50" />)}
                            </div>
                        )}

                        {isError && <p className="p-5 text-sm text-red-600">Cases could not be loaded.</p>}

                        {!isLoading && !isError && cases.length === 0 && (
                            <div className="p-8 text-center">
                                <p className="text-sm font-medium text-slate-700">No cases yet</p>
                                {canCreate && <Link href="/cases/new" className="mt-2 inline-flex text-xs font-medium text-indigo-700 hover:text-indigo-900">Create the first case</Link>}
                            </div>
                        )}

                        {!isLoading && cases.map((item) => (
                            <Link
                                key={item.id}
                                href={`/cases/${item.id}`}
                                className="group grid gap-1 border-b border-slate-100 px-4 py-3.5 last:border-b-0 hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_150px_18px] sm:items-center sm:gap-4"
                            >
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-medium text-slate-900">{item.case_title}</span>
                                    <span className="mt-0.5 block truncate text-xs text-slate-400">{item.petitioner_name} vs {item.respondent_name}</span>
                                </span>
                                <span className="text-xs text-slate-500 sm:text-right">
                                    <span className="block">{CASE_TYPE_LABELS[item.case_type]}</span>
                                    <span className="mt-0.5 block text-[10px] text-slate-400">{formatDate(item.next_hearing_date)}</span>
                                </span>
                                <ArrowRight className="hidden h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-600 sm:block" />
                            </Link>
                        ))}
                    </Surface>
                </section>

            </div>
        </WorkspacePage>
    );
}
