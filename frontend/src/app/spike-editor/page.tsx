"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { DocxEditor } from "@/features/docx-editor";
import type { PersistedEditorDocument } from "@/features/editor-core/serialization";
import {
    exportsApi,
    saveDownloadedFile,
    type ExportFormat,
} from "@/lib/api/exports";

const STORAGE_KEY = "vakilsuite_spike_editor_v1";
const INITIAL_CONTENT = `{"root":{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"यह एक परीक्षण दस्तावेज़ है (This is a test document).","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"paragraph","version":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Lexical editor in mobile browser/WebView test:","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"heading","version":1,"tag":"h3"},{"children":[{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Hindi IME typing support","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"listitem","version":1,"value":1},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Scrolling and viewport resize","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"listitem","version":1,"value":2},{"children":[{"detail":0,"format":0,"mode":"normal","style":"","text":"Undo / Redo buttons","type":"text","version":1}],"direction":"ltr","format":"","indent":0,"type":"listitem","version":1,"value":3}],"direction":"ltr","format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":"ltr","format":"","indent":0,"type":"root","version":1}}`;

type BridgeMessage =
    | { version: 1; type: "ready" }
    | { version: 1; type: "dirty"; dirty: boolean }
    | { version: 1; type: "saved"; characterCount: number; savedAt: string }
    | { version: 1; type: "error"; message: string };

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage: (message: string) => void };
    }
}

function postToNative(message: BridgeMessage): void {
    window.ReactNativeWebView?.postMessage(JSON.stringify(message));
}

function subscribeToLocation(): () => void {
    return () => undefined;
}

function getEmbeddedSnapshot(): boolean {
    return new URLSearchParams(window.location.search).get("embedded") === "1";
}

function getEmbeddedServerSnapshot(): boolean {
    return false;
}

export default function SpikeEditorPage() {
    const [initialContent, setInitialContent] = useState(INITIAL_CONTENT);
    const [editorKey, setEditorKey] = useState(0);
    const [savedContent, setSavedContent] = useState<string | null>(null);
    const embedded = useSyncExternalStore(
        subscribeToLocation,
        getEmbeddedSnapshot,
        getEmbeddedServerSnapshot,
    );

    useEffect(() => {
        postToNative({ version: 1, type: "ready" });
    }, []);

    const handleSave = useCallback(async (content: string) => {
        try {
            sessionStorage.setItem(STORAGE_KEY, content);
            setSavedContent(content);
            postToNative({
                version: 1,
                type: "saved",
                characterCount: content.length,
                savedAt: new Date().toISOString(),
            });
        } catch {
            postToNative({ version: 1, type: "error", message: "Session storage is unavailable." });
            throw new Error("Session storage is unavailable.");
        }
    }, []);

    const handleReload = useCallback(() => {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
            setInitialContent(stored);
            setEditorKey((value) => value + 1);
        } else {
            window.alert("No content has been saved in this editor session yet.");
        }
    }, []);

    const handleDirtyChange = useCallback((dirty: boolean) => {
        postToNative({ version: 1, type: "dirty", dirty });
    }, []);

    const handleExport = useCallback(async (content: string, format: ExportFormat) => {
        const editorDocument = JSON.parse(content) as PersistedEditorDocument;
        const file = await exportsApi.render({
            title: "VakilSuite editor test",
            file_name: "vakilsuite-editor-test",
            output_format: format,
            document: editorDocument,
        });
        saveDownloadedFile(file);
    }, []);

    return (
        <main className={`flex h-dvh w-full min-w-0 flex-col bg-slate-100 ${embedded ? "p-0" : "p-1 sm:p-4"}`}>
            {!embedded && (
                <header className="mb-2 flex items-center justify-between gap-2 px-2 py-1">
                    <div className="min-w-0">
                        <h1 className="truncate text-sm font-bold text-slate-900 sm:text-xl">Mobile Editor</h1>
                        <p className="hidden text-xs text-slate-600 sm:block">Use non-sensitive test content only.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReload}
                        className="min-h-10 shrink-0 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 sm:min-h-11 sm:text-sm"
                    >
                        Reload saved
                    </button>
                </header>
            )}

            <section aria-label="Docx editor prototype" className={`relative flex-1 overflow-hidden border border-slate-300 bg-white ${embedded ? "border-x-0" : "rounded-lg shadow"}`}>
                <div className="absolute inset-0">
                    <DocxEditor
                        key={editorKey}
                        draftId="spike-01"
                        initialContent={initialContent}
                        onSaveContent={handleSave}
                        onDirtyChange={handleDirtyChange}
                        onExportDocument={embedded ? undefined : handleExport}
                    />
                </div>
            </section>

            {!embedded && savedContent && (
                <div aria-live="polite" className="mt-2 truncate bg-slate-50 p-2 text-xs text-slate-600">
                    Saved in this browser session ({savedContent.length.toLocaleString()} characters)
                </div>
            )}
        </main>
    );
}
