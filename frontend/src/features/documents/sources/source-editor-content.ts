import type { OriginalSource } from "@/lib/api/original-sources";
export function hasText(value: unknown): boolean {
        if (!value || typeof value !== "object") return false;
        const node = value as Record<string, unknown>;
        if (node.type === "text" && typeof node.text === "string" && node.text.replace(/\[Original page \d+\]/g, "").trim()) return true;
        return Object.values(node).some(child => Array.isArray(child) ? child.some(hasText) : hasText(child));
}

export function initialSourceContent(document: OriginalSource["editor_document"]): string | null {
    if (!document) return null;
    if (hasText(document)) return JSON.stringify(document);
    // Start with one genuinely blank paragraph, not synthetic page labels.
    const state = document.editorState as Record<string, unknown>;
    const root = state.root as Record<string, unknown>;
    return JSON.stringify({...document, editorState: {...state, root: {...root, children: [
        {type: "paragraph", version: 1, direction: null, format: "", indent: 0, children: []},
    ]}}});
}
