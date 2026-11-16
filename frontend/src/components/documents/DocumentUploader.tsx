"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DocumentType, DOCUMENT_TYPE_LABELS } from "@/types/api";
import { documentKeys } from "@/features/documents/hooks/useDocuments";
import { useCasePermissions } from "@/features/cases/hooks/useCasePermissions";
import { useAuthStore } from "@/store/auth.store";
import { completeUpload, type UploadAttempt } from "@/lib/api/upload-document";
import type { components } from "@/types/generated-api";

const ALLOWED_MIME = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg", "image/png", "image/tiff", "image/webp",
];

export function DocumentUploader({ caseId, onSuccess, origin, prefilledFile }: {
    caseId: string;
    onSuccess?: (documentId: string) => void;
    origin?: components["schemas"]["FileOrigin"];
    /** A locally prepared file still requires an explicit upload click. */
    prefilledFile?: File | null;
}) {
    const qc = useQueryClient();
    const permissions = useCasePermissions(caseId);
    const [docType, setDocType] = useState<DocumentType>("other");
    const [phase, setPhase] = useState<"idle" | "uploading" | "success" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");
    const [retryLabel, setRetryLabel] = useState<string | null>(null);
    const attempt = useRef<UploadAttempt | null>(null);
    const queued = useRef<UploadAttempt[]>([]);
    const active = useRef<AbortController | null>(null);
    const generation = useAuthStore((state) => state.generation);

    useEffect(() => () => {
        active.current?.abort();
        active.current = null;
        attempt.current = null;
        queued.current = [];
    }, [caseId, generation]);

    function newAttempt(file: File): UploadAttempt | null {
        if (!ALLOWED_MIME.includes(file.type) || file.size <= 0 || file.size > 50 * 1024 * 1024) {
            setMessage(`${file.name}: choose a non-empty PDF, DOCX, JPG, PNG, TIFF or WebP file up to 50MB.`);
            setPhase("error");
            return null;
        }
        return { id: crypto.randomUUID(), caseId, file, documentType: docType, origin: origin ?? "web_upload" };
    }

    async function upload(file?: File) {
        if (active.current || !permissions.data?.can_edit) return;
        if (file) {
            const next = newAttempt(file);
            if (!next) return;
            attempt.current = next;
        }
        const current = attempt.current;
        if (!current) return;
        const controller = new AbortController();
        active.current = controller;
        const session = useAuthStore.getState();
        const isCurrent = () => !controller.signal.aborted
            && useAuthStore.getState().generation === session.generation
            && useAuthStore.getState().user?.id === session.user?.id;
        setPhase("uploading");
        setRetryLabel(null);
        setProgress(current.stored ? 100 : 0);
        setMessage(current.file.name);
        try {
            const id = await completeUpload(current, isCurrent, setProgress, controller.signal);
            if (!isCurrent()) return;
            attempt.current = null;
            setPhase("success");
            setMessage(`${current.file.name} uploaded. Original file is ready; no AI processing has started.`);
            void qc.invalidateQueries({ queryKey: documentKeys.list(caseId) });
            onSuccess?.(id);
        } catch (error) {
            if (!isCurrent()) return;
            setPhase("error");
            setRetryLabel(current.stored ? "Retry confirmation" : "Retry upload");
            setMessage(error instanceof Error ? error.message : "Upload failed. Please retry.");
            void qc.invalidateQueries({ queryKey: documentKeys.list(caseId) });
        } finally {
            if (active.current === controller) {
                active.current = null;
                if (attempt.current === null) {
                    const next = queued.current.shift();
                    if (next) {
                        attempt.current = next;
                        void upload();
                    }
                }
            }
        }
    }

    function uploadFiles(files: FileList | File[]) {
        if (busy) return;
        const attempts = Array.from(files).map(newAttempt).filter((value): value is UploadAttempt => value !== null);
        if (!attempts.length) return;
        queued.current.push(...attempts.slice(1));
        attempt.current = attempts[0];
        void upload();
    }

    if (permissions.isPending) return <p className="text-sm text-slate-500">Checking upload permission…</p>;
    if (permissions.isError) return <p role="alert" className="text-sm text-red-700">Cannot verify upload permission. <button onClick={() => void permissions.refetch()} className="underline">Retry</button></p>;
    if (!permissions.data?.can_edit) return <p className="text-sm text-slate-500">Read-only access. You can view original uploaded files.</p>;

    const busy = phase === "uploading";
    return (
        <div className="min-w-0 space-y-3">
            <label className="flex items-center gap-3 text-sm">
                Document type
                <select aria-label="Document type" value={docType} disabled={busy}
                    onChange={(e) => setDocType(e.target.value as DocumentType)}
                    className="min-w-0 rounded-lg border border-slate-200 bg-white p-2">
                    {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
            </label>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-200 p-6 text-center text-sm focus-within:ring-2 focus-within:ring-emerald-600"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (!busy) uploadFiles(e.dataTransfer.files); }}>
                <span>Drop files here or click to browse</span>
                <span className="text-xs text-slate-500">PDF, DOCX, JPG, PNG, TIFF, WebP · max 50MB</span>
                <input aria-label="Choose documents" type="file" multiple className="sr-only" disabled={busy}
                    accept=".pdf,.docx,.jpg,.jpeg,.png,.tiff,.tif,.webp"
                    onChange={(e) => { if (e.target.files?.length) uploadFiles(e.target.files); e.target.value = ""; }} />
            </label>
            {queued.current.length > 0 && <p role="status" className="text-sm text-slate-600">{queued.current.length} more file{queued.current.length === 1 ? "" : "s"} queued.</p>}
            {prefilledFile && phase !== "success" && <button type="button" disabled={busy} onClick={() => void upload(prefilledFile)} className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-600 disabled:opacity-60">Upload prepared PDF</button>}
            {busy && <progress aria-label="Upload progress" value={progress} max={100} className="w-full" />}
            {message && <p role={phase === "error" ? "alert" : "status"} className={phase === "error" ? "text-sm text-red-700" : "text-sm text-slate-600"}>{message}{busy ? ` · ${progress}%` : ""}</p>}
            {phase === "error" && retryLabel && <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 text-sm text-white"
                onClick={() => void upload()}>{retryLabel}</button>}
        </div>
    );
}
