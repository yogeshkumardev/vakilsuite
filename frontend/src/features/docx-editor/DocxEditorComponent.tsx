"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { DocxEditor as CasualDocxEditor, type DocxEditorRef } from "@casualoffice/docs";
import "@casualoffice/docs/styles.css";
import { DictationControl } from "./dictation/DictationControl";
import { Download, Printer, Save } from "lucide-react";
import type { ExportFormat } from "@/lib/api/exports";
import type { Document } from "@eigenpal/docx-core/types/document";
import {
    extractBase64FromContent,
    base64ToArrayBuffer,
    arrayBufferToBase64,
    parseContentToDocxDocument,
    buildEditorSavePayload,
    extractParagraphsFromEditor,
    extractRichParagraphsFromEditor,
} from "./content-conversion";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface DocxEditorProps {
    draftId?: string;
    documentBuffer?: ArrayBuffer | Uint8Array | Blob | File | null;
    initialContent?: string | null;
    /** Called with the raw DOCX ArrayBuffer on every save. */
    onSave?: (buffer: ArrayBuffer) => Promise<void> | void;
    /**
     * Called with a dual-format JSON string on every save:
     *   { schemaVersion, docx_base64, editorState, pageLayout }
     * Backward-compatible with PersistedEditorDocument (backend stores it in
     * a JSONB column; `editorState` is present for search/legacy export;
     * `docx_base64` enables lossless reload in the DOCX editor).
     */
    onSaveContent?: (content: string) => Promise<void> | void;
    onSaveStatus?: (status: SaveStatus) => void;
    onDirtyChange?: (isDirty: boolean) => void;
    /**
     * Called with a raw base64 DOCX string when the user clicks "Export .docx".
     * Callers should use `extractBase64FromContent(content)` + browser download,
     * NOT `JSON.parse(content)` (the string is not JSON).
     */
    onExportDocument?: (content: string, format: ExportFormat) => Promise<void> | void;
    readOnly?: boolean;
    readOnlyMessage?: string;
    author?: string;
    allowExport?: boolean;
    allowPrint?: boolean;
    onDownloadDocx?: () => void;
    sourcePageCount?: number;
    showSourcePageControls?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ResolvedDocState {
    buffer: ArrayBuffer | null;
    doc: Document | null;
    /** true when the content contained a DOCX binary — editor will show a loading state briefly */
    hasBuffer: boolean;
}

function resolveInitialDocState(
    bufferProp?: ArrayBuffer | Uint8Array | Blob | File | null,
    contentProp?: string | null,
): ResolvedDocState {
    if (bufferProp instanceof ArrayBuffer) return { buffer: bufferProp, doc: null, hasBuffer: true };
    if (bufferProp instanceof Uint8Array) return { buffer: bufferProp.buffer as ArrayBuffer, doc: null, hasBuffer: true };

    if (typeof contentProp === "string" && contentProp.trim()) {
        const b64 = extractBase64FromContent(contentProp);
        if (b64) {
            try {
                return { buffer: base64ToArrayBuffer(b64), doc: null, hasBuffer: true };
            } catch (err) {
                console.warn("[DocxEditorComponent] base64 decode failed:", err);
            }
        }
        return { buffer: null, doc: parseContentToDocxDocument(contentProp), hasBuffer: false };
    }

    return { buffer: null, doc: parseContentToDocxDocument(""), hasBuffer: false };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DocxEditorComponent({
    documentBuffer: initialBufferProp,
    initialContent,
    onSave,
    onSaveContent,
    onSaveStatus,
    onDirtyChange,
    onExportDocument,
    readOnly = false,
    readOnlyMessage,
    author = "Advocate",
    allowExport = true,
    allowPrint = true,
    sourcePageCount,
}: DocxEditorProps) {
    const editorRef = useRef<DocxEditorRef | null>(null);
    // `DocxEditorRef.exportDocx()` uses the editor's save pipeline, which in
    // turn invokes its `onSave` prop. Keep that promise so the host Save button
    // can await the same request instead of posting the same revision twice.
    const editorSavePromiseRef = useRef<Promise<void> | null>(null);
    const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
    const [isDirty, setIsDirty] = useState(false);

    // Track the last payload we sent so we don't re-process our own saves
    const lastSavedPayloadRef = useRef<string | null>(null);
    const prevInitialContentRef = useRef<string | null | undefined>(initialContent);

    const [resolvedState, setResolvedState] = useState<ResolvedDocState>(() =>
        resolveInitialDocState(initialBufferProp, initialContent),
    );

    /**
     * Loading overlay — shown while DocxEditor parses a DOCX binary.
     * Plain text/JSON → no flash (editor renders immediately).
     * Base64 DOCX binary → editor internally shows a spinner and hides its
     * formatting toolbar; we show our own overlay so the custom top-bar stays
     * visible and the experience is consistent.
     */
    const [isDocxLoading, setIsDocxLoading] = useState(
        () => resolveInitialDocState(initialBufferProp, initialContent).hasBuffer,
    );

    // Re-resolve when the initial content / buffer prop changes externally
    useEffect(() => {
        if (initialBufferProp instanceof ArrayBuffer) {
            setResolvedState({ buffer: initialBufferProp, doc: null, hasBuffer: true });
            setIsDocxLoading(true);
            return;
        }
        if (initialBufferProp instanceof Uint8Array) {
            setResolvedState({ buffer: initialBufferProp.buffer as ArrayBuffer, doc: null, hasBuffer: true });
            setIsDocxLoading(true);
            return;
        }
        if (initialContent !== prevInitialContentRef.current) {
            prevInitialContentRef.current = initialContent;
            // Skip echoes of our own saves
            if (initialContent && initialContent === lastSavedPayloadRef.current) return;
            const next = resolveInitialDocState(null, initialContent);
            setResolvedState(next);
            setIsDocxLoading(next.hasBuffer);
        }
    }, [initialBufferProp, initialContent]);

    // ---- Handlers --------------------------------------------------------

    const handleDirtyChange = useCallback(
        (dirty: boolean) => { setIsDirty(dirty); onDirtyChange?.(dirty); },
        [onDirtyChange],
    );

    const handleSave = useCallback(
        async (buffer: ArrayBuffer) => {
            try {
                setSaveStatus("saving");
                onSaveStatus?.("saving");

                if (onSave) await onSave(buffer);

                if (onSaveContent) {
                    // Extract latest rich paragraphs (with formatting & marks) from live PagedEditor / PM state
                    const richNodes = extractRichParagraphsFromEditor(editorRef.current);
                    const payload = buildEditorSavePayload(buffer, richNodes, {
                        sourcePageCount: sourcePageCount ?? 1,
                    });
                    lastSavedPayloadRef.current = payload;
                    await onSaveContent(payload);
                }

                setSaveStatus("saved");
                onSaveStatus?.("saved");
                handleDirtyChange(false);
            } catch (error) {
                console.error("[DocxEditorComponent] Save failed:", error);
                setSaveStatus("error");
                onSaveStatus?.("error");
            }
        },
        [handleDirtyChange, onSave, onSaveContent, onSaveStatus, sourcePageCount],
    );

    const handleEditorSave = useCallback((buffer: ArrayBuffer) => {
        const savePromise = handleSave(buffer);
        editorSavePromiseRef.current = savePromise;
        void savePromise.finally(() => {
            if (editorSavePromiseRef.current === savePromise) {
                editorSavePromiseRef.current = null;
            }
        });
        return savePromise;
    }, [handleSave]);

    const triggerManualSave = useCallback(async () => {
        if (!editorRef.current || readOnly) return;
        try {
            editorSavePromiseRef.current = null;
            const buffer = await editorRef.current.exportDocx();
            // exportDocx() deliberately runs the editor's onSave callback.
            // Do not call handleSave(buffer) here: doing both created a 200
            // followed by a stale-version 409 for one user click.
            if (buffer && editorSavePromiseRef.current) {
                await editorSavePromiseRef.current;
            }
        } catch (err) {
            console.error("[DocxEditorComponent] Manual save error:", err);
            setSaveStatus("error");
        }
    }, [readOnly]);

    const handlePrint = useCallback(() => {
        editorRef.current ? editorRef.current.print() : window.print();
    }, []);

    /**
     * Export button handler.
     * If `onExportDocument` is provided, we pass the raw base64 DOCX string.
     * Callers MUST NOT JSON.parse this — use `base64ToArrayBuffer` instead.
     * When no handler is provided we do a direct browser blob download.
     */
    const handleExport = useCallback(async () => {
        if (!editorRef.current) return;
        try {
            const buffer = await editorRef.current.exportDocx();
            if (!buffer) return;

            if (onExportDocument) {
                // Pass raw base64 (not JSON-wrapped) so the caller can download directly
                await onExportDocument(arrayBufferToBase64(buffer), "docx");
            } else {
                // Default: browser blob download
                const blob = new Blob([buffer], {
                    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `document_${Date.now()}.docx`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (err) {
            console.error("[DocxEditorComponent] Export error:", err);
        }
    }, [onExportDocument]);

    /**
     * Returns the ProseMirror EditorView from the hidden PM layer.
     * Used by DictationControl to insert transcribed text.
     *
     * IMPORTANT: `view.dispatch(tr)` on the hidden EditorView goes through
     * PM's internal `dispatchTransaction` → triggers `onTransaction` → the
     * paged renderer re-layouts and shows the new text.
     */
    const getView = useCallback(() => {
        return editorRef.current?.getEditorRef()?.getView() as unknown as import("./dictation/useProseMirrorDictation").EditorViewLike;
    }, []);

    // ---- Render ----------------------------------------------------------

    return (
        <div className="docx-editor-root flex h-full w-full flex-col overflow-hidden bg-slate-100 text-slate-800">
            {/* Top bar: Dictation controls + Save / Print / Export */}
            <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5 shadow-xs">
                <div className="flex items-center gap-2">
                    {/* Disable dictation while DOCX is still being parsed — getView() returns null during load */}
                    <DictationControl getView={getView} readOnly={readOnly || isDocxLoading} />
                </div>

                <div className="flex items-center gap-2 text-xs">
                    {readOnly && readOnlyMessage && (
                        <span className="rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 border border-amber-200">
                            {readOnlyMessage}
                        </span>
                    )}

                    {!readOnly && (
                        <div className="flex items-center gap-2">
                            {saveStatus === "saving" && (
                                <span className="flex items-center gap-1 text-slate-500 font-medium">
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                                    Saving…
                                </span>
                            )}
                            {saveStatus === "saved" && !isDirty && (
                                <span className="text-emerald-600 font-medium">✓ Saved</span>
                            )}
                            {isDirty && saveStatus !== "saving" && (
                                <span className="text-amber-600 font-medium">● Unsaved edits</span>
                            )}
                            {saveStatus === "error" && (
                                <button type="button" onClick={triggerManualSave}
                                    className="text-red-600 underline hover:text-red-800 font-medium">
                                    Save failed — Retry
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={triggerManualSave}
                                disabled={readOnly || saveStatus === "saving"}
                                className="flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 border border-slate-300 disabled:opacity-50"
                                title="Save (Ctrl+S)"
                            >
                                <Save size={13} /><span>Save</span>
                            </button>
                        </div>
                    )}

                    {allowPrint && (
                        <button type="button" onClick={handlePrint}
                            className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
                            title="Print document">
                            <Printer size={13} /><span className="hidden sm:inline">Print</span>
                        </button>
                    )}

                    {allowExport && (
                        <button type="button" onClick={handleExport}
                            className="flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 shadow-xs"
                            title="Download Word Document (.docx)">
                            <Download size={13} /><span>Export .docx</span>
                        </button>
                    )}
                </div>
            </div>

            {/* DOCX editor canvas */}
            <div className="relative min-h-0 flex-1 overflow-hidden h-full w-full">
                <CasualDocxEditor
                    ref={editorRef}
                    document={resolvedState.doc}
                    documentBuffer={resolvedState.buffer}
                    author={author}
                    readOnly={readOnly}
                    chrome="embedded"
                    showToolbar={true}
                    showStatusBar={false}
                    showZoomControl={false}
                    showRuler={false}
                    onSave={handleEditorSave}
                    onDirtyChange={handleDirtyChange}
                    onReady={(_api) => setIsDocxLoading(false)}
                    onError={(err) => console.error("[CasualDocxEditor] Error:", err)}
                />
                {/* Overlay shown while DOCX binary is being parsed.
                    Keeps the top-bar visible and prevents interaction with
                    the editor before the PM view is ready for dictation. */}
                {isDocxLoading && (
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-10"
                    >
                        <span className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                            Opening document…
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
