"use client";

import React, { useCallback, useMemo, useRef } from "react";
import DocxEditorComponent from "@/features/docx-editor/DocxEditorComponent";
import { blocksToSummaryMarkdown } from "@/features/docx-editor/content-conversion";
export type ReviewBlock = { id: string; title: string; text: string };

interface SummaryWordEditorProps {
    blocks: ReviewBlock[];
    readOnly?: boolean;
    onSave?: (editorState: Record<string, unknown>) => Promise<void> | void;
    onDirtyChange?: (dirty: boolean) => void;
}

/**
 * Parses markdown or plain text paragraphs back into updated texts for each block.
 * Skips lines starting with '#' (headings/titles) so advocate edits to body text map
 * cleanly back to the source-bound blocks expected by the backend `apply_edits`.
 */
function mapEditedTextBackToBlocks(
    savedContent: string,
    originalBlocks: ReviewBlock[],
): Record<string, unknown> {
    const lines = savedContent
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !l.startsWith("#") && !l.startsWith("*"));

    const element = { version: 1, direction: null, format: "", indent: 0 };
    let lineIdx = 0;

    const children = originalBlocks.map((b) => {
        const text = lineIdx < lines.length ? lines[lineIdx++] : b.text;
        return {
            ...element,
            type: "summary-review-block",
            blockId: b.id,
            title: b.title,
            children: [
                {
                    ...element,
                    type: "paragraph",
                    children: [
                        {
                            type: "text",
                            version: 1,
                            text,
                            format: 0,
                            detail: 0,
                            mode: "normal",
                            style: "",
                        },
                    ],
                },
            ],
        };
    });

    return {
        root: {
            ...element,
            type: "root",
            children,
        },
    };
}

export function SummaryWordEditor({
    blocks,
    readOnly = false,
    onSave,
    onDirtyChange,
}: SummaryWordEditorProps) {
    const blocksRef = useRef(blocks);
    blocksRef.current = blocks;

    // Generate clean, professional legal markdown with non-repeating section headings
    const initialContent = useMemo(() => {
        return blocksToSummaryMarkdown(blocks);
    }, [blocks]);

    const handleSaveContent = useCallback(
        async (savedPayload: string) => {
            if (!onSave) return;
            try {
                // If the payload is JSON from buildEditorSavePayload, extract plain text first
                let rawText = savedPayload;
                if (savedPayload.startsWith("{")) {
                    try {
                        const parsed = JSON.parse(savedPayload);
                        const root = parsed.editorState?.root ?? parsed.root;
                        if (root?.children) {
                            const texts: string[] = [];
                            const walk = (node: any) => {
                                if (node.type === "text" && node.text) texts.push(node.text);
                                if (Array.isArray(node.children)) node.children.forEach(walk);
                            };
                            walk(root);
                            rawText = texts.join("\n");
                        }
                    } catch {
                        /* fallback to rawText */
                    }
                }

                const updatedState = mapEditedTextBackToBlocks(rawText, blocksRef.current);
                await onSave(updatedState);
            } catch (err) {
                console.error("[SummaryWordEditor] Save error:", err);
                throw err;
            }
        },
        [onSave],
    );

    return (
        <div className="flex-1 min-h-0 h-full w-full overflow-hidden bg-white flex flex-col">
            <DocxEditorComponent
                initialContent={initialContent}
                readOnly={readOnly}
                readOnlyMessage={readOnly ? "Case summary review is locked or approved." : undefined}
                allowExport={true}
                allowPrint={true}
                author="Advocate"
                onSaveContent={handleSaveContent}
                onDirtyChange={onDirtyChange}
            />
        </div>
    );
}
