"use client";

import { DocReviewStatus, ProcessingStatus } from "@/lib/api/documents";
import {
    Columns2,
    FileText,
    ListChecks,
    TextCursorInput,
    Upload,
    BookOpen,
} from "lucide-react";
import Link from "next/link";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

export type DocumentWorkspaceView =
    "original" | "compare" | "typed" | "workflow" | "information";

interface DocumentWorkspaceToolbarProps {
    caseId: string;
    filename: string;
    pageCount: number | null;
    processingStatus: ProcessingStatus;
    reviewStatus: DocReviewStatus;
    view: DocumentWorkspaceView;
    typedAvailable: boolean;
    onViewChange: (view: DocumentWorkspaceView) => void;
}

const VIEW_OPTIONS = [
    { value: "original", label: "Original", icon: FileText },
    { value: "information", label: "Information", icon: BookOpen },
    { value: "compare", label: "Compare", icon: Columns2 },
    { value: "typed", label: "Typed", icon: TextCursorInput },
    { value: "workflow", label: "Processing", icon: ListChecks },
] as const;

export function DocumentWorkspaceToolbar({
    caseId,
    filename,
    pageCount,
    processingStatus,
    reviewStatus,
    view,
    typedAvailable,
    onViewChange,
}: DocumentWorkspaceToolbarProps) {
    return (
        <div className="flex shrink-0 flex-col gap-2 border-b border-slate-200 bg-white px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between lg:px-5">
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Link href="/cases" className="hover:text-slate-700">
                        Cases
                    </Link>
                    <span>/</span>
                    <Link
                        href={`/cases/${caseId}`}
                        className="hover:text-slate-700"
                    >
                        Case
                    </Link>
                    <span>/</span>
                    <Link
                        href={`/cases/${caseId}?tab=documents`}
                        className="hover:text-slate-700 font-medium text-slate-600"
                    >
                        All Documents
                    </Link>
                </div>
                <div className="mt-0.5 flex min-w-0 items-center gap-2">
                    <h1
                        title={filename}
                        className="min-w-0 truncate text-sm font-semibold text-slate-900"
                    >
                        {filename}
                    </h1>
                    {pageCount ? (
                        <span className="shrink-0 text-[10px] text-slate-400">
                            {pageCount} pages
                        </span>
                    ) : null}
                    <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            processingStatus === "failed"
                                ? "bg-red-500"
                                : processingStatus === "processing"
                                  ? "animate-pulse bg-amber-500"
                                  : reviewStatus === "approved"
                                    ? "bg-emerald-500"
                                    : "bg-slate-300"
                        }`}
                        title={processingStatus}
                    />
                </div>
            </div>

            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 lg:max-w-[65%] lg:shrink-0">
                <Link
                    href={`/cases/${caseId}?tab=documents`}
                    className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors shrink-0"
                    title="Upload new document"
                >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload Document</span>
                </Link>

                <SegmentedControl
                    label="Document view"
                    value={view}
                    options={VIEW_OPTIONS.map((option) => ({
                        ...option,
                        disabled:
                            (option.value === "compare" ||
                                option.value === "typed") &&
                            !typedAvailable,
                    }))}
                    onChange={onViewChange}
                />
            </div>
        </div>
    );
}
