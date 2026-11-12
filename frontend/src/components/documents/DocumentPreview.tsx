"use client";

import { useState } from "react";
import { useDocumentViewUrl } from "@/features/documents/hooks/useDocuments";
import { Download, FileImage, FileText, LoaderCircle, Printer, RefreshCw } from "lucide-react";
import Image from "next/image";

interface DocumentPreviewProps {
    documentId: string;
    mimeType: string;
    filename: string;
    active: boolean;
}

export function DocumentPreview({
    documentId,
    mimeType,
    filename,
    active,
}: DocumentPreviewProps) {
    const { data, isError, isLoading, refetch } = useDocumentViewUrl(documentId, active);
    const [frameError, setFrameError] = useState(false);
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");
    const errorMessage = "We couldn’t load the preview. Refresh the link or return to your documents and try again.";
    const FileIcon = isPdf ? FileText : FileImage;

    return (
        <div className="relative flex h-full min-h-0 flex-col bg-slate-100">
            {active && data && <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-2 py-1 text-sm">
                <a href={data.url} download={filename} referrerPolicy="no-referrer" className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-md px-2 py-1 font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"><Download className="h-4 w-4" />Download original</a>
                <a href={data.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex min-h-11 sm:min-h-8 items-center gap-1.5 rounded-md px-2 py-1 font-medium text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-600"><Printer className="h-4 w-4" />Open to print</a>
                <button onClick={() => { setFrameError(false); void refetch(); }} className="min-h-11 sm:min-h-8 rounded-md px-2 py-1 text-slate-700 underline focus:outline-none focus:ring-2 focus:ring-emerald-600">Refresh link</button>
            </div>}
            {!active && !data && (
                <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                    <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm">
                        <FileIcon className="h-6 w-6" />
                    </span>
                    <p className="max-w-sm truncate text-sm font-medium text-slate-700">{filename}</p>
                </div>
            )}

            {active && isLoading && (
                <div className="flex h-full items-center justify-center gap-2 text-sm text-slate-500">
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Loading document
                </div>
            )}

            {active && (isError || frameError) && (
                <div className="flex h-full items-center justify-center p-6">
                    <div className="max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-5 text-center">
                        <p className="text-sm font-semibold text-amber-900">Preview unavailable</p>
                        <p className="mt-1 text-xs leading-5 text-amber-700">{frameError ? "The browser could not display this signed original. Refresh the link or use the download action above." : errorMessage}</p>
                        <button
                            type="button"
                            onClick={() => { setFrameError(false); void refetch(); }}
                            className="mx-auto mt-4 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Retry
                        </button>
                    </div>
                </div>
            )}

            {active && data && isPdf && !frameError && (
                <iframe
                    src={data.url}
                    className="h-full w-full border-0 bg-white"
                    title={filename}
                    onError={() => setFrameError(true)}
                />
            )}

            {active && data && isImage && (
                <div className="relative h-full w-full p-4 md:p-6">
                    <Image
                        src={data.url}
                        alt={filename}
                        fill
                        className="object-contain p-4 md:p-6"
                        unoptimized
                    />
                </div>
            )}

            {active && data && !isPdf && !isImage && (
                <div className="flex h-full items-center justify-center p-8 text-sm text-slate-500">
                    Preview is not available for this file type.
                </div>
            )}
        </div>
    );
}
