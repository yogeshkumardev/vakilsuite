import { DEFAULT_PAGE_LAYOUT, type PageLayoutSettings } from "./page-layout";

/**
 * Compatibility shape for persisted editor state. Older revisions use a
 * Lexical-shaped tree; the DOCX editor continues to emit this structure for
 * search and server compatibility without loading Lexical at runtime.
 */
export type SerializedEditorState = Record<string, unknown>;

/** Increment only through an explicit migration of all supported editor clients. */
export const EDITOR_DOCUMENT_SCHEMA_VERSION = 1 as const;

export interface PersistedEditorDocument {
    schemaVersion: typeof EDITOR_DOCUMENT_SCHEMA_VERSION;
    editorState: SerializedEditorState;
    pageLayout: PageLayoutSettings;
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEditorState(value: unknown): value is SerializedEditorState {
    return isObject(value) && isObject(value.root);
}

function isPageLayout(value: unknown): value is PageLayoutSettings {
    return isObject(value) && ["A4", "A3", "Legal", "Letter"].includes(String(value.pageSize)) && ["portrait", "landscape"].includes(String(value.orientation)) && [value.marginTop, value.marginRight, value.marginBottom, value.marginLeft].every((margin) => typeof margin === "number" && Number.isFinite(margin));
}

export function parsePersistedEditorDocument(content: string | null): { editorState: SerializedEditorState | null; pageLayout: PageLayoutSettings } {
    if (!content) return { editorState: null, pageLayout: DEFAULT_PAGE_LAYOUT };
    try {
        const parsed: unknown = JSON.parse(content);
        if (isObject(parsed) && parsed.schemaVersion === EDITOR_DOCUMENT_SCHEMA_VERSION && isEditorState(parsed.editorState)) {
            return { editorState: parsed.editorState, pageLayout: isPageLayout(parsed.pageLayout) ? parsed.pageLayout : DEFAULT_PAGE_LAYOUT };
        }
        if (isEditorState(parsed)) return { editorState: parsed, pageLayout: DEFAULT_PAGE_LAYOUT };
    } catch {
        // Legacy HTML/Markdown remains intentionally handled by InitialContentPlugin.
    }
    return { editorState: null, pageLayout: DEFAULT_PAGE_LAYOUT };
}

export function serializeEditorDocument(editorState: SerializedEditorState, pageLayout: PageLayoutSettings): string {
    return JSON.stringify({ schemaVersion: EDITOR_DOCUMENT_SCHEMA_VERSION, editorState, pageLayout } satisfies PersistedEditorDocument);
}
