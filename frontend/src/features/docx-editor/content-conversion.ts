/**
 * content-conversion.ts
 *
 * Utilities for converting between the various content formats used across
 * the SaaS (legacy editor JSON, plain text, markdown, base64 DOCX) and the
 * @eigenpal/docx-core `Document` type expected by the new DOCX editor.
 *
 * Save-payload format (dual-format, backward-compatible):
 *   {
 *     schemaVersion: 1,
 *     docx_base64: "<base64 DOCX>",   ← enables lossless reload
 *     editorState: { root: { children: [paragraph nodes] } },  ← backward compat + server indexing
 *     pageLayout: { ... }             ← backend/export API compat
 *   }
 *
 * The backend stores this in a JSONB column (`editor_document`). On reload,
 * `extractBase64FromContent` finds `docx_base64` and loads the binary so
 * round-trip fidelity is preserved.  Legacy code that only reads `editorState`
 * still works because those keys are present.
 */

import { createEmptyDocument, type CreateEmptyDocumentOptions } from "@eigenpal/docx-core";
import type { Document, Paragraph, Run, TextContent } from "@eigenpal/docx-core/types/document";

// ---------------------------------------------------------------------------
// 1. Format detection / extraction
// ---------------------------------------------------------------------------

/**
 * Returns true if `content` is (or wraps) a base64-encoded DOCX binary.
 * Handles three cases:
 *   • Raw base64 string starting with "UEsDB" (ZIP magic bytes)
 *   • data-URI  "data:application/vnd…;base64,UEsDB…"
 *   • Dual-format JSON: { docx_base64: "UEsDB…" }
 */
export function isBase64Docx(content: string): boolean {
    if (typeof content !== "string") return false;
    const t = content.trim();
    if (t.startsWith("UEsDB") || t.startsWith("data:application/vnd.openxmlformats-officedocument")) return true;
    if (t.startsWith("{") && t.includes('"docx_base64"')) {
        try {
            const p = JSON.parse(t);
            const b64 = (typeof p.docx_base64 === "string" ? p.docx_base64 : p.editorState?.docx_base64) as string | undefined;
            return typeof b64 === "string" && (b64.startsWith("UEsDB") || b64.startsWith("data:application"));
        } catch { return false; }
    }
    return false;
}

/**
 * Extracts the raw base64 string (no data-URI prefix) from any of the formats
 * described in `isBase64Docx`. Returns null when no base64 is found.
 */
export function extractBase64FromContent(content: string): string | null {
    if (typeof content !== "string") return null;
    const t = content.trim();
    if (t.startsWith("UEsDB") || t.startsWith("data:application/vnd.openxmlformats-officedocument")) {
        return t.replace(/^data:.*?;base64,/, "").trim();
    }
    if (t.startsWith("{") && t.includes('"docx_base64"')) {
        try {
            const p = JSON.parse(t);
            const b64 = (typeof p.docx_base64 === "string" ? p.docx_base64 : p.editorState?.docx_base64) as string | undefined;
            if (typeof b64 === "string") return b64.replace(/^data:.*?;base64,/, "").trim();
        } catch { return null; }
    }
    return null;
}

// ---------------------------------------------------------------------------
// 2. Binary ↔ base64 helpers (SSR-safe: no `window.atob`/`window.btoa`)
// ---------------------------------------------------------------------------

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
    const clean = base64.replace(/^data:.*?;base64,/, "").trim();
    if (typeof Buffer !== "undefined") {
        const buf = Buffer.from(clean, "base64");
        return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    }
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
    if (typeof Buffer !== "undefined") return Buffer.from(buffer).toString("base64");
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

// ---------------------------------------------------------------------------
// 3. Content → docx-core Document  (for the `document` prop on initial load)
// ---------------------------------------------------------------------------

interface LegacyEditorNode {
    type?: string;
    tag?: string;             // e.g. "h1", "h2" for headings
    text?: string;
    format?: number;
    children?: LegacyEditorNode[];
    [key: string]: unknown;
}

/**
 * Extracts inline Run objects from leaf/inline nodes (text, linebreak, link, etc.).
 */
function extractRunsFromInlineNodes(
    nodes: LegacyEditorNode[],
    baseFontSize = 24,
    forceBold = false,
): Run[] {
    const runs: Run[] = [];
    for (const node of nodes) {
        if (!node) continue;
        if (node.type === "text" && typeof node.text === "string" && node.text.length > 0) {
            const fmt = typeof node.format === "number" ? node.format : 0;
            runs.push({
                type: "run",
                content: [{ type: "text", text: node.text }],
                formatting: {
                    fontSize: baseFontSize,
                    bold: forceBold || (fmt & 1) !== 0 || undefined,
                    italic: (fmt & 2) !== 0 || undefined,
                    strike: (fmt & 4) !== 0 || undefined,
                    underline: (fmt & 8) !== 0 ? { style: "single" } : undefined,
                    fontFamily: { ascii: "Arial", hAnsi: "Arial" },
                },
            });
        } else if (node.type === "linebreak") {
            runs.push({
                type: "run",
                content: [{ type: "break" } as any],
                formatting: { fontSize: baseFontSize, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
            });
        } else if (Array.isArray(node.children)) {
            // Recurse for inline containers (e.g. link, autolink, span)
            runs.push(...extractRunsFromInlineNodes(node.children, baseFontSize, forceBold));
        }
    }
    return runs;
}

/**
 * Splits inline runs into separate docx-core Paragraph objects whenever newline
 * characters (`\n`, `\r\n`) or hard break items occur.
 *
 * CRITICAL FIX for text line overlapping:
 * The docx-core layout engine (measureParagraph) uses Canvas/font-metric measurement
 * and `white-space: pre` inside fixed-height line divs. It expects `run.text` to NEVER
 * contain embedded newlines. When multiline text is placed into a single TextRun,
 * the measurement calculates the bounding box for a single line, but the browser wraps
 * on `\n` inside the line element, causing following lines to overflow downward and
 * overlap adjacent text. Splitting by newlines into discrete Paragraphs guarantees
 * each line has its own layout block and height, completely eliminating text overlap.
 */
function splitRunsIntoParagraphs(
    runs: Run[],
    formatting: Paragraph["formatting"] = { lineSpacing: 276 },
    baseFontSize = 24,
): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    let currentRuns: Run[] = [];

    function flushCurrentLine() {
        if (currentRuns.length === 0) {
            paragraphs.push({
                type: "paragraph",
                content: [{
                    type: "run",
                    content: [],
                    formatting: { fontSize: baseFontSize, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
                }],
                formatting,
            });
        } else {
            paragraphs.push({
                type: "paragraph",
                content: currentRuns,
                formatting,
            });
            currentRuns = [];
        }
    }

    for (const run of runs) {
        if (run.type !== "run" || !Array.isArray(run.content)) {
            currentRuns.push(run);
            continue;
        }

        const runFmt = run.formatting;
        let pendingText = "";

        for (const item of run.content) {
            if (item.type === "break") {
                if (pendingText.length > 0) {
                    currentRuns.push({ type: "run", content: [{ type: "text", text: pendingText }], formatting: runFmt });
                    pendingText = "";
                }
                flushCurrentLine();
            } else if (item.type === "text" && typeof item.text === "string" && item.text.includes("\n")) {
                const parts = item.text.split(/\r?\n/);
                for (let i = 0; i < parts.length; i++) {
                    if (i > 0) {
                        if (pendingText.length > 0) {
                            currentRuns.push({ type: "run", content: [{ type: "text", text: pendingText }], formatting: runFmt });
                            pendingText = "";
                        }
                        flushCurrentLine();
                    }
                    if (parts[i].length > 0) {
                        pendingText += parts[i];
                    }
                }
            } else if (item.type === "text" && typeof item.text === "string") {
                pendingText += item.text;
            } else {
                if (pendingText.length > 0) {
                    currentRuns.push({ type: "run", content: [{ type: "text", text: pendingText }], formatting: runFmt });
                    pendingText = "";
                }
                currentRuns.push({ type: "run", content: [item], formatting: runFmt });
            }
        }

        if (pendingText.length > 0) {
            currentRuns.push({ type: "run", content: [{ type: "text", text: pendingText }], formatting: runFmt });
        }
    }

    if (currentRuns.length > 0) {
        paragraphs.push({
            type: "paragraph",
            content: currentRuns,
            formatting,
        });
    }

    if (paragraphs.length === 0) {
        paragraphs.push({
            type: "paragraph",
            content: [{
                type: "run",
                content: [],
                formatting: { fontSize: baseFontSize, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
            }],
            formatting,
        });
    }

    return paragraphs;
}

/**
 * Recursively walks ANY Lexical AST (including container nodes like `source-page`,
 * `list`, `quote`, `root`, etc.) and extracts docx-core Paragraph objects.
 */
function walkLegacyEditorNode(node: LegacyEditorNode | null | undefined, paragraphs: Paragraph[]): void {
    if (!node) return;
    const type = node.type;

    if (type === "paragraph" || type === "heading" || type === "quote" || type === "listitem") {
        const isHeading = type === "heading";
        const level = node.tag === "h1" ? 1 : node.tag === "h2" ? 2 : node.tag === "h3" ? 3 : isHeading ? 1 : 0;
        const fontSize = level === 1 ? 32 : level === 2 ? 28 : level === 3 ? 26 : 24;
        const forceBold = level > 0;

        const children = Array.isArray(node.children) ? node.children : [];
        const hasBlockChildren = children.some(
            (c) => c && ["paragraph", "heading", "quote", "list", "listitem", "source-page"].includes(c.type ?? ""),
        );

        if (hasBlockChildren) {
            for (const child of children) {
                walkLegacyEditorNode(child, paragraphs);
            }
        } else {
            let runs = extractRunsFromInlineNodes(children, fontSize, forceBold);
            if (type === "listitem") {
                runs = [
                    {
                        type: "run",
                        content: [{ type: "text", text: "• " }],
                        formatting: { fontSize, bold: true, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
                    },
                    ...runs,
                ];
            }
            const lineParagraphs = splitRunsIntoParagraphs(runs, { lineSpacing: 276 }, fontSize);
            paragraphs.push(...lineParagraphs);
        }
    } else if (
        type === "source-page" ||
        type === "root" ||
        type === "list" ||
        type === "table" ||
        type === "tablerow" ||
        type === "tablecell"
    ) {
        // Container node: recursively traverse all children
        const children = Array.isArray(node.children) ? node.children : [];
        for (const child of children) {
            walkLegacyEditorNode(child, paragraphs);
        }
    } else if (type === "text") {
        // Stray top-level text node
        if (typeof node.text === "string" && node.text.trim()) {
            const lines = node.text.split(/\r?\n/);
            for (const line of lines) {
                paragraphs.push({
                    type: "paragraph",
                    content: [{
                        type: "run",
                        content: line ? [{ type: "text", text: line }] : [],
                        formatting: { fontSize: 24, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
                    }],
                    formatting: { lineSpacing: 276 },
                });
            }
        }
    }
}

function parseLegacyEditorToParagraphs(root: LegacyEditorNode): Paragraph[] {
    const paragraphs: Paragraph[] = [];
    walkLegacyEditorNode(root, paragraphs);
    return paragraphs;
}

/** Strips HTML tags and returns plain text, preserving newlines at block boundaries. */
function htmlToPlainText(html: string): string {
    return html
        .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, "\n# $1\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<\/div>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** Splits a markdown line into Run objects, handling **bold** and *italic*. */
function markdownLineToRuns(line: string, fontSize: number, forceBold = false): Run[] {
    if (!line) return [{ type: "run", content: [], formatting: { fontSize, fontFamily: { ascii: "Arial", hAnsi: "Arial" } } }];

    const tokens = line.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*)/g);
    const runs: Run[] = [];

    for (const token of tokens) {
        if (!token) continue;
        let text = token;
        let bold = forceBold;
        let italic = false;

        if (text.startsWith("**") && text.endsWith("**") && text.length >= 4) {
            text = text.slice(2, -2); bold = true;
        } else if (text.startsWith("*") && text.endsWith("*") && text.length >= 2) {
            text = text.slice(1, -1); italic = true;
        }

        if (text.length > 0) {
            runs.push({
                type: "run",
                content: [{ type: "text", text }],
                formatting: { fontSize, bold: bold || undefined, italic: italic || undefined, fontFamily: { ascii: "Arial", hAnsi: "Arial" } },
            });
        }
    }

    return runs.length > 0
        ? runs
        : [{ type: "run", content: [], formatting: { fontSize, fontFamily: { ascii: "Arial", hAnsi: "Arial" } } }];
}

/**
 * Converts any text content (plain text, markdown, HTML, legacy editor JSON,
 * or PersistedEditorDocument JSON) into a docx-core `Document` suitable
 * for the `document` prop of `<DocxEditor>`.
 */
export function parseContentToDocxDocument(
    content: string | null | undefined,
    options?: CreateEmptyDocumentOptions,
): Document {
    const doc = createEmptyDocument({
        pageWidth: 11906, pageHeight: 16838,
        marginTop: 1440, marginBottom: 1440, marginLeft: 1440, marginRight: 1440,
        ...options,
        initialText: "",
    });

    if (!content?.trim()) return doc;
    const t = content.trim();

    // Legacy persisted-editor JSON
    if (t.startsWith("{") && (t.includes('"root"') || t.includes('"editorState"'))) {
        try {
            const parsed = JSON.parse(t);
            const root = (parsed.editorState?.root ?? parsed.root) as LegacyEditorNode | undefined;
            if (root && Array.isArray(root.children)) {
                const paragraphs = parseLegacyEditorToParagraphs(root);
                if (paragraphs.length > 0) { doc.package.document.content = paragraphs; return doc; }
            }
        } catch { /* fall through */ }
    }

    // HTML → plain text, then treat as plain text / markdown below
    const rawText = t.includes("<p>") || t.includes("<br") || t.includes("<div>") ? htmlToPlainText(t) : t;

    const paragraphs: Paragraph[] = rawText.split(/\r?\n/).map((line) => {
        const tl = line.trimEnd();
        const level = tl.startsWith("### ") ? 3 : tl.startsWith("## ") ? 2 : tl.startsWith("# ") ? 1 : 0;
        const text = level > 0 ? tl.slice(level + 1) : tl;
        const fontSize = level === 1 ? 32 : level === 2 ? 28 : level === 3 ? 26 : 24;
        return { type: "paragraph" as const, content: markdownLineToRuns(text, fontSize, level > 0), formatting: { lineSpacing: 276 } };
    });

    if (paragraphs.length > 0) doc.package.document.content = paragraphs;
    return doc;
}

// ---------------------------------------------------------------------------
// 4. Editor / Document → plain text paragraphs
// ---------------------------------------------------------------------------

/** Extracts all paragraph text from a docx-core `Document`, one entry per paragraph. */
export function extractParagraphsFromDocument(document: Document | null): string[] {
    if (!document?.package?.document?.content) return [];
    const paragraphs: string[] = [];

    for (const block of document.package.document.content) {
        if (block.type !== "paragraph") continue;
        let para = "";
        for (const run of block.content) {
            if (run.type !== "run") continue;
            for (const item of run.content) {
                if (item.type === "text" && item.text) para += item.text;
            }
        }
        paragraphs.push(para);
    }
    return paragraphs;
}

/**
 * Robust paragraph extractor from an active editor instance.
 * Checks the live PagedEditor document, ProseMirror doc state, or docModel fallback.
 */
export function extractParagraphsFromEditor(
    editorRef: {
        getEditorRef?: () => {
            getDocument?: () => Document | null;
            getState?: () => { doc?: { forEach?: (cb: (node: any) => void) => void; textContent?: string } } | null;
        } | null;
        getDocument?: () => Document | null;
    } | null | undefined,
): string[] {
    if (!editorRef) return [];

    // 1. Try PagedEditor's getDocument() (converts live PM state to Document)
    try {
        const liveDoc = editorRef.getEditorRef?.()?.getDocument?.();
        if (liveDoc) {
            const texts = extractParagraphsFromDocument(liveDoc);
            if (texts.length > 0 && texts.some((t) => t.trim().length > 0)) {
                return texts;
            }
        }
    } catch { /* ignore */ }

    // 2. Try direct ProseMirror state doc iteration
    try {
        const pmDoc = editorRef.getEditorRef?.()?.getState?.()?.doc;
        if (pmDoc && typeof pmDoc.forEach === "function") {
            const texts: string[] = [];
            pmDoc.forEach((node: any) => {
                if (node && node.isTextblock) {
                    texts.push(node.textContent ?? "");
                }
            });
            if (texts.length > 0 && texts.some((t) => t.trim().length > 0)) {
                return texts;
            }
        }
    } catch { /* ignore */ }

    // 3. Fallback to top-level getDocument()
    try {
        const doc = editorRef.getDocument?.();
        if (doc) {
            const texts = extractParagraphsFromDocument(doc);
            if (texts.length > 0) return texts;
        }
    } catch { /* ignore */ }

    return [];
}

/**
 * Extracts rich, formatted Lexical paragraph/heading nodes from an active editor instance.
 * Preserves bold (1), italic (2), strikethrough (4), underline (8), and heading levels (h1, h2, h3).
 */
export function extractRichParagraphsFromEditor(
    editorRef: {
        getEditorRef?: () => {
            getDocument?: () => Document | null;
            getState?: () => { doc?: { forEach?: (cb: (node: any) => void) => void } } | null;
        } | null;
        getDocument?: () => Document | null;
    } | null | undefined,
): any[] {
    if (!editorRef) return [];

    // 1. Try ProseMirror live doc state (most direct and accurate for marks)
    try {
        const pmDoc = editorRef.getEditorRef?.()?.getState?.()?.doc;
        if (pmDoc && typeof pmDoc.forEach === "function") {
            const nodes: any[] = [];
            pmDoc.forEach((node: any) => {
                if (!node || !node.isTextblock) return;
                const isHeading = node.type?.name === "heading";
                const level = node.attrs?.level ?? 1;
                const children: any[] = [];

                if (node.content && typeof node.content.forEach === "function") {
                    node.content.forEach((child: any) => {
                        if (child.isText && child.text) {
                            let format = 0;
                            if (Array.isArray(child.marks)) {
                                for (const m of child.marks) {
                                    const name = (m.type?.name ?? "").toLowerCase();
                                    if (name === "bold" || name === "strong") format |= 1;
                                    if (name === "italic" || name === "em") format |= 2;
                                    if (name === "strike" || name === "strikethrough") format |= 4;
                                    if (name === "underline") format |= 8;
                                }
                            }
                            children.push({
                                type: "text",
                                text: child.text,
                                format,
                                version: 1,
                                detail: 0,
                                mode: "normal",
                                style: "",
                            });
                        } else if (child.type?.name === "hardBreak") {
                            children.push({ type: "linebreak", version: 1 });
                        }
                    });
                }

                nodes.push({
                    type: isHeading ? "heading" : "paragraph",
                    ...(isHeading ? { tag: `h${level}` } : {}),
                    version: 1,
                    format: "",
                    indent: 0,
                    direction: null,
                    children: children.length > 0
                        ? children
                        : [{ type: "text", text: "", format: 0, version: 1, detail: 0, mode: "normal", style: "" }],
                });
            });

            if (nodes.length > 0 && nodes.some((n) => n.children.some((c: any) => c.text?.trim()?.length > 0))) {
                return nodes;
            }
        }
    } catch { /* ignore */ }

    // 2. Try live docx-core Document
    try {
        const liveDoc = editorRef.getEditorRef?.()?.getDocument?.() ?? editorRef.getDocument?.();
        if (liveDoc?.package?.document?.content) {
            const nodes: any[] = [];
            for (const block of liveDoc.package.document.content) {
                if (block.type !== "paragraph") continue;
                const children: any[] = [];
                for (const run of block.content) {
                    if (run.type !== "run") continue;
                    let format = 0;
                    if (run.formatting?.bold) format |= 1;
                    if (run.formatting?.italic) format |= 2;
                    if (run.formatting?.strike) format |= 4;
                    if (run.formatting?.underline) format |= 8;
                    for (const item of run.content) {
                        if (item.type === "text" && item.text) {
                            children.push({
                                type: "text",
                                text: item.text,
                                format,
                                version: 1,
                                detail: 0,
                                mode: "normal",
                                style: "",
                            });
                        } else if (item.type === "break") {
                            children.push({ type: "linebreak", version: 1 });
                        }
                    }
                }
                const styleId = (block.formatting?.styleId ?? "").toLowerCase();
                const isHeading = styleId.startsWith("heading") || styleId === "title";
                const tag = styleId === "heading1" || styleId === "title" ? "h1" : styleId === "heading2" ? "h2" : isHeading ? "h3" : undefined;
                nodes.push({
                    type: isHeading ? "heading" : "paragraph",
                    ...(tag ? { tag } : {}),
                    version: 1,
                    format: "",
                    indent: 0,
                    direction: null,
                    children: children.length > 0
                        ? children
                        : [{ type: "text", text: "", format: 0, version: 1, detail: 0, mode: "normal", style: "" }],
                });
            }
            if (nodes.length > 0) return nodes;
        }
    } catch { /* ignore */ }

    // 3. Fallback: plain text paragraphs
    const plain = extractParagraphsFromEditor(editorRef);
    return plain.map((text) => ({
        type: "paragraph",
        version: 1,
        format: "",
        indent: 0,
        direction: null,
        children: text.length > 0 ? [{ type: "text", text, format: 0, version: 1, detail: 0, mode: "normal", style: "" }] : [],
    }));
}

// ---------------------------------------------------------------------------
// 5. Save payload  (Strictly compliant with backend validate_editor_document)
// ---------------------------------------------------------------------------

export interface BuildSavePayloadOptions {
    sourcePageCount?: number;
}

/**
 * Builds the string written to `onSaveContent`.
 *
 * Preserves:
 *   1. Full formatting (bold=1, italic=2, strike=4, underline=8, headings)
 *   2. Source-page envelope (`pageNumber: 1..N`) required by backend review & page_paths
 *   3. DOCX binary in `editorState.docx_base64` for 100% lossless reload in Word Editor
 *
 * NOTE: The backend strictly enforces `set(value) == {"schemaVersion", "editorState", "pageLayout"}`
 * at the top level. `docx_base64` is placed inside `editorState` where the backend validator allows it.
 */
export function buildEditorSavePayload(
    buffer: ArrayBuffer | null,
    source: Document | string[] | any[] | null,
    options?: BuildSavePayloadOptions,
): string {
    let lexicalParagraphs: any[] = [];

    if (Array.isArray(source) && source.length > 0 && typeof source[0] === "object" && source[0]?.type) {
        // Rich Lexical nodes
        lexicalParagraphs = source;
    } else {
        const paragraphTexts = Array.isArray(source)
            ? (source as string[])
            : extractParagraphsFromDocument(source as Document);

        lexicalParagraphs = paragraphTexts.map((text) => ({
            type: "paragraph",
            version: 1,
            format: "",
            indent: 0,
            direction: null,
            children: text.length > 0
                ? [{ type: "text", text, format: 0, version: 1, detail: 0, mode: "normal", style: "" }]
                : [],
        }));
    }

    if (lexicalParagraphs.length === 0) {
        lexicalParagraphs = [{
            type: "paragraph",
            version: 1,
            format: "",
            indent: 0,
            direction: null,
            children: [],
        }];
    }

    // Source page envelope (required by backend source_service and page_provenance for review confirmation)
    const pageCount = options?.sourcePageCount ?? 0;
    let rootChildren: any[] = [];

    if (pageCount >= 1) {
        if (pageCount === 1) {
            rootChildren = [{
                type: "source-page",
                version: 1,
                pageNumber: 1,
                direction: null,
                format: "",
                indent: 0,
                children: lexicalParagraphs,
            }];
        } else {
            // Multi-page document: partition paragraphs across page containers
            // Each page container MUST have at least one non-blank paragraph so page_paths doesn't reject
            const perPage = Math.max(1, Math.ceil(lexicalParagraphs.length / pageCount));
            for (let page = 1; page <= pageCount; page++) {
                const start = (page - 1) * perPage;
                const end = page === pageCount ? lexicalParagraphs.length : Math.min(start + perPage, lexicalParagraphs.length);
                const pageParas = lexicalParagraphs.slice(start, end);
                rootChildren.push({
                    type: "source-page",
                    version: 1,
                    pageNumber: page,
                    direction: null,
                    format: "",
                    indent: 0,
                    children: pageParas.length > 0
                        ? pageParas
                        : [{
                            type: "paragraph",
                            version: 1,
                            format: "",
                            indent: 0,
                            direction: null,
                            children: [{ type: "text", text: `[Original page ${page}]`, format: 0, version: 1, detail: 0, mode: "normal", style: "" }],
                        }],
                });
            }
        }
    } else {
        rootChildren = lexicalParagraphs;
    }

    // Embed DOCX binary inside editorState for lossless reload if present
    const b64 = buffer && buffer.byteLength > 0 ? arrayBufferToBase64(buffer) : undefined;

    return JSON.stringify({
        schemaVersion: 1,
        editorState: {
            root: {
                type: "root",
                format: "",
                indent: 0,
                version: 1,
                direction: null,
                children: rootChildren.length > 0
                    ? rootChildren
                    : [{ type: "paragraph", version: 1, format: "", indent: 0, direction: null, children: [] }],
            },
            ...(b64 ? { docx_base64: b64 } : {}),
        },
        pageLayout: { pageSize: "A4", orientation: "portrait", marginTop: 72, marginRight: 72, marginBottom: 72, marginLeft: 72 },
    });
}

/**
 * Formats case summary blocks into a beautifully structured, readable legal document
 * with unified section headers (no duplicate headings per sentence).
 */
export function blocksToSummaryMarkdown(
    blocks: Array<{ id: string; title: string; text: string }>,
): string {
    if (!blocks || blocks.length === 0) return "";

    const lines: string[] = [
        "# CASE SUMMARY & FACTUAL MATRIX",
        "*Court of Record Analysis · Advocate Review & Drafting Reference*",
        "",
    ];

    let lastTitle = "";
    let sectionNum = 1;

    for (const b of blocks) {
        const cleanTitle = (b.title ?? "").trim();
        if (cleanTitle && cleanTitle !== lastTitle) {
            lastTitle = cleanTitle;
            lines.push("");
            lines.push(`## ${sectionNum}. ${cleanTitle.toUpperCase()}`);
            lines.push("");
            sectionNum++;
        }
        if (b.text && b.text.trim()) {
            lines.push(b.text.trim());
            lines.push("");
        }
    }

    return lines.join("\n");
}

/**
 * Extracts plain text from a save payload (dual-format JSON or plain string).
 * Used by document-review callers that save `content_markdown` (plain text, not JSON).
 */
export function extractPlainTextFromSavePayload(payload: string): string {
    if (!payload) return "";
    try {
        const parsed = JSON.parse(payload);
        const children = parsed?.editorState?.root?.children as Array<{ children?: Array<{ text?: string }> }> | undefined;
        if (Array.isArray(children)) {
            return children
                .map((para) => (para.children ?? []).map((t) => t.text ?? "").join(""))
                .join("\n");
        }
    } catch { /* not JSON — treat as plain text */ }
    return payload;
}
