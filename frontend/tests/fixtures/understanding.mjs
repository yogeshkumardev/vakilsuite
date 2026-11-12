const field = (id, label, value, bbox) => ({
    id,
    kind: "field",
    label,
    value,
    bbox,
    text: `${label}: ${value}`,
    presence: "present",
    evidence_ids: [id + "-line"],
    warnings: ["field_link_unreviewed"],
    rows: 0,
    columns: 0,
    cells: [],
});
const table = {
    id: "p1-table",
    kind: "table",
    bbox: [20, 100, 280, 180],
    text: "",
    rows: 4,
    columns: 2,
    evidence_ids: [],
    warnings: ["table_structure_unreviewed"],
    cells: [
        ["Act", "Section"],
        ["Example A", "101"],
        ["Example B", "202"],
        ["Example C", "303"],
    ].flatMap((row, r) =>
        row.map((text, c) => ({
            row: r,
            column: c,
            rowspan: 1,
            colspan: 1,
            bbox: [20 + 130 * c, 100 + 20 * r, 150 + 130 * c, 120 + 20 * r],
            text,
            evidence_ids: [`cell-${r}-${c}`],
        })),
    ),
};
export const evidence = {
    revision: {
        id: "revision",
        content_hash: "a".repeat(64),
        stale: false,
        structure: {
            schema_version: 5,
            source_hash: "b".repeat(64),
            pages: [
                {
                    number: 1,
                    width: 300,
                    height: 400,
                    warnings: ["layout_unreviewed"],
                    blocks: [
                        field(
                            "station",
                            "Station",
                            "Sample North",
                            [20, 20, 140, 60],
                        ),
                        field(
                            "number",
                            "FIR number",
                            "0097",
                            [160, 20, 280, 60],
                        ),
                        table,
                        {
                            ...field("paragraph", "", "", [20, 205, 280, 280]),
                            kind: "paragraph",
                            text: "Sample allegations remain unverified. This synthetic paragraph contains no real case data.",
                        },
                    ],
                },
                {
                    number: 2,
                    width: 300,
                    height: 400,
                    warnings: ["layout_unreviewed"],
                    blocks: [
                        field("page2", "Date", "2026-01-01", [20, 20, 280, 70]),
                    ],
                },
            ],
        },
    },
    coverage: {
        can_query: true,
        can_create_typed_copy: true,
        can_prepare_evidence_snapshot: true,
        queryable_pages: [1, 2],
        unresolved_pages: [1, 2],
        total_pages: 2,
        status: "partial",
    },
};
