"use client";
import { CaseActions } from "@/components/cases/CaseActions";
import { useAuthStore } from "@/store/auth.store";

import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/shared/Button";
import { useCaseList } from "@/features/cases/hooks/useCases";
import { Case, CASE_TYPE_LABELS, CaseStatus, CaseType } from "@/types/api";
import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Alert } from "@/components/ui/Alert";
import { Input, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { WorkspacePage } from "@/components/ui/WorkspacePage";

export default function CasesPage() {
    const canCreate = useAuthStore((state) => state.user?.role !== "munshi");
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<CaseStatus | "">("");
    const [typeFilter, setTypeFilter] = useState<CaseType | "">("");

    const { data, isLoading, isError } = useCaseList({
        page,
        limit: 20,
        search: debouncedSearch || undefined,
        status: statusFilter || undefined,
        case_type: typeFilter || undefined,
    });

    const handleSearch = (val: string) => {
        setSearch(val);
        clearTimeout(
            (
                window as unknown as {
                    __searchTimer: ReturnType<typeof setTimeout>;
                }
            ).__searchTimer,
        );
        (
            window as unknown as {
                __searchTimer: ReturnType<typeof setTimeout>;
            }
        ).__searchTimer = setTimeout(() => {
            setDebouncedSearch(val);
            setPage(1);
        }, 350);
    };

    const cases = data?.cases ?? [];
    const pagination = data?.pagination;
    return (
        <WorkspacePage>
            <PageHeader
                title="Cases"
                description={pagination ? `${pagination.total} total` : undefined}
                actions={canCreate &&
                <Link
                    href='/cases/new'
                    className='inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                >
                    <Plus className="h-4 w-4" />
                    New Case
                </Link>
                }
            />

            <div className='mb-5 flex flex-col gap-3 sm:flex-row sm:items-center'>
                <div className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                        type='search'
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder='Search by title, petitioner, respondent…'
                        className="pl-9"
                    />
                </div>
                <Select
                    value={statusFilter}
                    onChange={(e) => {
                        setStatusFilter(e.target.value as CaseStatus | "");
                        setPage(1);
                    }}
                    className="sm:w-40"
                >
                    <option value=''>All statuses</option>
                    <option value='active'>Active</option>
                    <option value='disposed'>Disposed</option>
                    <option value='archived'>Archived</option>
                </Select>
                <Select
                    value={typeFilter}
                    onChange={(e) => {
                        setTypeFilter(e.target.value as CaseType | "");
                        setPage(1);
                    }}
                    className="sm:w-44"
                >
                    <option value=''>All types</option>
                    {Object.entries(CASE_TYPE_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>
                            {l}
                        </option>
                    ))}
                </Select>
            </div>

            {isLoading && (
                <div className='space-y-2'>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div
                            key={i}
                            className='h-16 rounded-lg bg-slate-100 animate-pulse'
                        />
                    ))}
                </div>
            )}

            {isError && (
                <Alert tone="danger" title="Cases could not be loaded">
                    Please refresh and try again.
                </Alert>
            )}

            {!isLoading && !isError && cases.length === 0 && (
                <EmptyState
                    title='No cases found'
                    description={
                        debouncedSearch || statusFilter || typeFilter
                            ? "No cases match your filters."
                            : canCreate ? "Create your first case to get started." : "No cases have been assigned to you yet."
                    }
                    actionLabel={
                        canCreate && !debouncedSearch && !statusFilter && !typeFilter
                            ? "+ New Case"
                            : undefined
                    }
                    actionHref='/cases/new'
                />
            )}

            {!isLoading && cases.length > 0 && (
                <div className='overflow-x-auto rounded-lg border border-slate-200 bg-white'>
                    <table className='min-w-[760px] w-full text-sm'>
                        <thead>
                            <tr className='border-b border-slate-100 bg-slate-50'>
                                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                    Case
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                    Type
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                    Status
                                </th>
                                <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500'>
                                    Next Hearing
                                </th>
                                <th className='px-4 py-3' />
                            </tr>
                        </thead>
                        <tbody className='divide-y divide-slate-50'>
                            {cases.map((c: Case) => (
                                <tr
                                    key={c.id}
                                    className='hover:bg-slate-50 transition-colors group'
                                >
                                    <td className='px-4 py-3'>
                                        <Link
                                            href={`/cases/${c.id}`}
                                            className='block'
                                        >
                                            <p className='font-medium text-slate-900 truncate max-w-xs'>
                                                {c.case_title}
                                            </p>
                                            <p className='text-xs text-slate-400 mt-0.5'>
                                                {c.petitioner_name} vs{" "}
                                                {c.respondent_name}
                                            </p>
                                        </Link>
                                    </td>
                                    <td className='px-4 py-3 text-xs text-slate-600'>
                                        {CASE_TYPE_LABELS[c.case_type]}
                                    </td>
                                    <td className='px-4 py-3'>
                                        <CaseStatusBadge
                                            status={c.status}
                                            stage={c.stage}
                                        />
                                    </td>
                                    <td className='px-4 py-3 text-xs text-slate-600'>
                                        {c.next_hearing_date
                                            ? new Date(
                                                  c.next_hearing_date,
                                              ).toLocaleDateString("en-IN", {
                                                  day: "2-digit",
                                                  month: "short",
                                                  year: "numeric",
                                              })
                                            : "—"}
                                    </td>
                                    <td className='px-4 py-3 text-right'>
                                        <Link
                                            href={`/cases/${c.id}`}
                                            className='text-xs font-medium text-slate-400 hover:text-slate-700'
                                        >
                                            View →
                                        </Link>
                                        <CaseActions item={c} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pagination && pagination.total_pages > 1 && (
                <div className='flex items-center justify-between mt-4'>
                    <p className='text-xs text-slate-500'>
                        Showing {(page - 1) * 20 + 1}–
                        {Math.min(page * 20, pagination.total)} of{" "}
                        {pagination.total}
                    </p>
                    <div className='flex gap-1.5'>
                        <Button
                            variant='secondary'
                            size='sm'
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            ← Prev
                        </Button>
                        <span className='rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 bg-slate-50 flex items-center'>
                            {page} / {pagination.total_pages}
                        </span>
                        <Button
                            variant='secondary'
                            size='sm'
                            onClick={() =>
                                setPage((p) =>
                                    Math.min(pagination.total_pages, p + 1),
                                )
                            }
                            disabled={page === pagination.total_pages}
                        >
                            Next →
                        </Button>
                    </div>
                </div>
            )}
        </WorkspacePage>
    );
}
