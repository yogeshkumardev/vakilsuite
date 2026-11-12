/** @returns {import('../../src/features/documents/editor/structure').StructuredNode} */
const text = (id, value) => ({
    id,
    type: "paragraph",
    runs: [{ text: value, bold: false, italic: false, underline: false }],
    children: [],
    cells: [],
    rows: 0,
    columns: 0,
    column_widths: [],
    level: 2,
    alignment: "left",
    source_refs: [{ page: 1, bbox: [50, 60, 350, 100], method: "native" }],
});
/** @type {import('../../src/features/documents/editor/structure').StructuredDocument} */
export const structure = {
    schema_version: 4,
    source_hash: "a".repeat(64),
    pages: [
        {
            number: 1,
            width: 595.44,
            height: 841.68,
            source_kind: "digital",
            route: "native",
            nodes: [
                text("heading", "Sample legal annexure"),
                {
                    ...text("table", ""),
                    type: "table",
                    runs: [],
                    rows: 2,
                    columns: 3,
                    column_widths: [1, 2, 1],
                    cells: [
                        {
                            row: 0,
                            column: 0,
                            rowspan: 1,
                            colspan: 3,
                            header: true,
                            children: [
                                text("header", "\u0928\u093e\u092e / Merged bilingual heading"),
                            ],
                        },
                        {
                            row: 1,
                            column: 0,
                            rowspan: 1,
                            colspan: 1,
                            header: false,
                            children: [text("label", "Reference")],
                        },
                        {
                            row: 1,
                            column: 1,
                            rowspan: 1,
                            colspan: 1,
                            header: false,
                            children: [text("value", "Original value")],
                        },
                        {
                            row: 1,
                            column: 2,
                            rowspan: 1,
                            colspan: 1,
                            header: false,
                            children: [text("empty", "")],
                        },
                    ],
                },
            ],
        },
    ],
    issues: [
        {
            id: "layout-1",
            page: 1,
            node_id: null,
            kind: "layout_review",
            message: "Compare table layout against the original page.",
            blocking: true,
            status: "open",
            resolution_note: "",
            resolved_by: null,
            resolved_at: null,
        },
    ],
    field_links: [],
    layout: { margin_pt: 36, font_size_pt: 12, font_family: "Noto Sans Devanagari" },
};
/** @type {import('../../src/lib/api/documents').TypedRevision} */
export const revision = {
    id: "00000000-0000-4000-8000-000000000001",
    document_id: "00000000-0000-4000-8000-000000000002",
    processing_run_id: null,
    parent_revision_id: null,
    revision_number: 1,
    lock_version: 1,
    content_markdown: "Sample",
    content_hash: "b".repeat(64),
    canonical_structure: structure,
    canonical_schema_version: 4,
    status: "draft",
    created_by: "00000000-0000-4000-8000-000000000003",
    approved_by: null,
    approved_at: null,
    created_at: "2026-09-23T00:00:00",
    updated_at: "2026-09-23T00:00:00",
};
export const document = {
    id: revision.document_id,
    original_filename: "synthetic-annexure.pdf",
    display_name: "Synthetic annexure",
    mime_type: "application/pdf",
};
