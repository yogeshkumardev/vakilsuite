"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { draftsApi } from "@/lib/api/drafts";
import { DocxEditor } from "@/features/docx-editor";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import { exportsApi, saveDownloadedFile, type ExportFormat } from "@/lib/api/exports";

export default function DraftPage() {
    const params = useParams();
    const router = useRouter();
    const caseId = params.id as string;
    const draftId = params.draft_id as string;

    const { data: draft, isLoading, error } = useQuery({
        queryKey: ["draft", draftId],
        queryFn: () => draftsApi.get(draftId),
    });

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Loading draft…
            </div>
        );
    }

    if (error || !draft) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-red-500">
                Failed to load draft. Please refresh and try again.
            </div>
        );
    }

    const handleExport = async (content: string, format: ExportFormat) => {
        const file = await exportsApi.render({
            title: draft.title,
            file_name: draft.title,
            output_format: format,
            document: JSON.parse(content) as PersistedEditorDocument,
        });
        saveDownloadedFile(file);
    };

    return (
        <div className="flex h-full flex-col">
            {/* Page header — compact horizontal line */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button
                        onClick={() => router.push(`/cases/${caseId}/context`)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 shrink-0"
                    >
                        ← Back to Context
                    </button>
                    <div className="h-4 w-px bg-slate-200 shrink-0" />
                    <h1 className="text-xs font-bold text-slate-900 truncate">{draft.title}</h1>
                    <span className="text-[11px] text-slate-500 capitalize shrink-0">
                        {draft.status} · v{draft.version}
                    </span>
                </div>
            </div>

            {/* Docx Editor — fills remaining height */}
            <div className="flex-1 overflow-hidden">
                <DocxEditor
                    draftId={draft.id}
                    initialContent={draft.content}
                    onExportDocument={handleExport}
                />
            </div>
        </div>
    );
}
