"use client";

import { useState } from "react";
import Image from "next/image";
import { useDocumentViewUrl } from "@/features/documents/hooks/useDocuments";
import {
    useExtraction,
    useReviewExtraction,
} from "@/features/extraction/hooks/useExtraction";
import { ExtractionFieldEditor } from "@/components/documents/ExtractionFieldEditor";
import { OcrStatusBadge } from "@/components/documents/OcrStatusBadge";
import { LegacyDocument as Document } from "@/lib/api/documents";
import { ReviewStatus } from "@/lib/api/extraction";

interface SplitPaneViewerProps {
    document: Document;
    onTypingRequested?: () => void;
}

export function SplitPaneViewer({
    document,
    onTypingRequested,
}: SplitPaneViewerProps) {
    const [viewUrlEnabled, setViewUrlEnabled] = useState(false);

    const { data: viewUrlData, isError: viewUrlError, error: viewUrlErrorValue } = useDocumentViewUrl(
        document.id,
        viewUrlEnabled,
    );
    const { data: extraction, isLoading: extractionLoading } = useExtraction(
        document.id,
    );
    const reviewExtraction = useReviewExtraction(document.id);

    const handleReview = async (
        fields: Record<string, unknown>,
        status: ReviewStatus,
    ) => {
        if (!extraction) return;
        await reviewExtraction.mutateAsync({
            extractionId: extraction.id,
            extracted_fields: fields,
            review_status: status,
        });
    };

    const isPdf = document.mime_type === "application/pdf";
    const isImage = document.mime_type.startsWith("image/");
    const previewErrorMessage = viewUrlErrorValue instanceof Error
        ? viewUrlErrorValue.message
        : "Document preview is unavailable. Confirm upload or re-upload the document.";

    return (
        <div className='flex h-full min-h-0'>
            {/* ── Left pane: Document viewer ── */}
            <div className='flex-1 flex flex-col border-r border-slate-200 min-w-0'>
                {/* Toolbar */}
                <div className='flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50'>
                    <div className='min-w-0'>
                        <p className='text-sm font-medium text-slate-800 truncate'>
                            {document.display_name ??
                                document.original_filename}
                        </p>
                        <div className='flex items-center gap-2 mt-0.5'>
                            <OcrStatusBadge status={document.ocr_status} />
                            {document.page_count && (
                                <span className='text-xs text-slate-400'>
                                    {document.page_count} pages
                                </span>
                            )}
                        </div>
                    </div>

                    <div className='flex items-center gap-2 flex-shrink-0'>
                        {onTypingRequested &&
                            document.ocr_status === "completed" && (
                                <button
                                    type='button'
                                    onClick={onTypingRequested}
                                    className='rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-white transition-colors'
                                >
                                    Type This Document
                                </button>
                            )}
                        {!viewUrlEnabled && (
                            <button
                                type='button'
                                onClick={() => setViewUrlEnabled(true)}
                                className='rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 transition-colors'
                            >
                                Load Document
                            </button>
                        )}
                    </div>
                </div>

                {/* Document display */}
                <div className='flex-1 overflow-auto bg-slate-100 flex items-center justify-center'>
                    {!viewUrlEnabled && (
                        <div className='text-center p-8'>
                            <span className='text-4xl mb-3 block'>
                                {isPdf ? "📄" : "🖼️"}
                            </span>
                            <p className='text-sm text-slate-500'>
                                Click &quot;Load Document&quot; to view
                            </p>
                        </div>
                    )}

                    {viewUrlEnabled && !viewUrlData && !viewUrlError && (
                        <div className='flex items-center gap-2 text-sm text-slate-400'>
                            <div className='h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-500' />
                            Loading document…
                        </div>
                    )}

                    {viewUrlEnabled && viewUrlError && (
                        <div className='max-w-sm rounded-lg border border-amber-200 bg-amber-50 p-4 text-center'>
                            <p className='text-sm font-semibold text-amber-800'>Preview unavailable</p>
                            <p className='mt-1 text-xs leading-relaxed text-amber-700'>{previewErrorMessage}</p>
                        </div>
                    )}

                    {viewUrlData && isPdf && (
                        <iframe
                            src={viewUrlData.url}
                            className='w-full h-full border-0'
                            title={document.original_filename}
                        />
                    )}

                    {viewUrlData && isImage && (
                        <div className='relative w-full h-full p-4'>
                            <Image
                                src={viewUrlData.url}
                                alt={document.original_filename}
                                fill
                                className='object-contain'
                                unoptimized
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right pane: Extraction fields ── */}
            <div className='w-80 flex-shrink-0 flex flex-col'>
                {extractionLoading && (
                    <div className='flex-1 flex items-center justify-center'>
                        <div className='h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600' />
                    </div>
                )}

                {!extractionLoading && !extraction && (
                    <div className='flex-1 flex flex-col items-center justify-center p-6 text-center'>
                        <span className='text-3xl mb-3'>⏳</span>
                        <p className='text-sm font-medium text-slate-700'>
                            Extraction pending
                        </p>
                        <p className='text-xs text-slate-400 mt-1'>
                            {document.ocr_status === "completed"
                                ? "Extraction will run shortly"
                                : "Waiting for OCR to complete"}
                        </p>
                    </div>
                )}

                {!extractionLoading && extraction && (
                    <ExtractionFieldEditor
                        extractedFields={extraction.extracted_fields}
                        reviewStatus={extraction.review_status}
                        onSave={handleReview}
                        saving={reviewExtraction.isPending}
                    />
                )}
            </div>
        </div>
    );
}
