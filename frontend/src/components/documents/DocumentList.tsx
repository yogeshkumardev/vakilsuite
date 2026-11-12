"use client";

import { useState } from "react";
import Link from "next/link";
import {
    useDocuments,
    useDeleteDocument,
} from "@/features/documents/hooks/useDocuments";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Document } from "@/lib/api/documents";
import { DOCUMENT_TYPE_LABELS } from "@/types/api";
import { FileImage, FileText, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useCasePermissions } from "@/features/cases/hooks/useCasePermissions";

interface DocumentListProps {
    caseId: string;
    onViewDocument?: (doc: Document) => void;
}

const UPLOAD_STATUS: Record<
    Document["upload_status"],
    { label: string; tone: BadgeTone }
> = {
    pending: { label: "Pending", tone: "neutral" },
    uploading: { label: "Uploading", tone: "info" },
    uploaded: { label: "Uploaded", tone: "success" },
    failed: { label: "Upload incomplete", tone: "danger" },
    quarantined: { label: "Replacement required", tone: "danger" },
};

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DocumentList({ caseId, onViewDocument }: DocumentListProps) {
    const { data: documents, isLoading, isError } = useDocuments(caseId);
    const deleteDoc = useDeleteDocument(caseId);
    const permissions = useCasePermissions(caseId);
    const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);

    if (isLoading) {
        return (
            <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className="h-14 rounded-lg bg-slate-100 animate-pulse"
                    />
                ))}
            </div>
        );
    }

    if (isError) {
        return (
            <p className="text-sm text-red-600 py-2">
                Failed to load documents.
            </p>
        );
    }

    if (!documents?.length) {
        return (
            <p className="text-sm text-slate-400 py-4 text-center">
                No documents uploaded yet.
            </p>
        );
    }

    return (
        <>
            <div className="space-y-1.5">
                {documents.map((doc) => (
                    <div
                        key={doc.id}
                        className="flex min-w-0 flex-wrap items-center justify-between gap-y-2 rounded-lg border border-slate-100 bg-white px-3 py-2.5 hover:border-slate-200 transition-colors"
                    >
                        <Link
                            href={`/cases/${caseId}/documents/${doc.id}`}
                            className="flex items-center gap-3 min-w-0 flex-1"
                        >
                            {doc.mime_type === "application/pdf" ? (
                                <FileText className="h-5 w-5 shrink-0 text-slate-400" />
                            ) : (
                                <FileImage className="h-5 w-5 shrink-0 text-slate-400" />
                            )}
                            <div className="min-w-0 flex-1">
                                <p
                                    title={
                                        doc.display_name ??
                                        doc.original_filename
                                    }
                                    className="text-sm font-medium leading-6 text-slate-800 truncate"
                                >
                                    {doc.display_name ?? doc.original_filename}
                                </p>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                    <span className="text-xs text-slate-400">
                                        {
                                            DOCUMENT_TYPE_LABELS[
                                                doc.document_type
                                            ]
                                        }
                                    </span>
                                    <span className="text-xs text-slate-300">
                                        ·
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {formatBytes(doc.file_size_bytes)}
                                    </span>
                                </div>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <Badge
                                tone={
                                    UPLOAD_STATUS[doc.upload_status]
                                        .tone
                                }
                            >
                                {UPLOAD_STATUS[doc.upload_status].label}
                            </Badge>
                            {permissions.data?.can_edit && <IconButton
                                onClick={() => setConfirmDelete(doc)}
                                label="Delete document"
                                tone="danger"
                                size="sm"
                                icon={<Trash2 className="h-4 w-4" />}
                            />}
                        </div>
                    </div>
                ))}
            </div>

            {deleteDoc.error && <p role="alert" className="text-sm text-red-700">{deleteDoc.error.message}</p>}
            <ConfirmDialog
                open={!!confirmDelete}
                title="Delete document?"
                description={`"${confirmDelete?.display_name ?? confirmDelete?.original_filename}" will be permanently deleted from storage.`}
                confirmLabel="Delete"
                variant="danger"
                loading={deleteDoc.isPending}
                onConfirm={async () => {
                    if (confirmDelete) {
                        try {
                            await deleteDoc.mutateAsync(confirmDelete.id);
                            setConfirmDelete(null);
                        } catch { /* Mutation error is displayed above; keep confirmation open. */ }
                    }
                }}
                onCancel={() => setConfirmDelete(null)}
            />
        </>
    );
}
