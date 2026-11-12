export interface TextRun {
    text: string;
    bold: boolean;
    italic: boolean;
    underline: boolean;
}
export interface SourceRef {
    page: number;
    bbox: [number, number, number, number];
    method: "native" | "local_ocr" | "vision" | "human";
}
export interface StructuredCell {
    row: number;
    column: number;
    rowspan: number;
    colspan: number;
    header: boolean;
    children: StructuredNode[];
}
export interface StructuredNode {
    id: string;
    type:
        | "paragraph"
        | "heading"
        | "table"
        | "group"
        | "page_break"
        | "unknown";
    runs: TextRun[];
    children: StructuredNode[];
    cells: StructuredCell[];
    rows: number;
    columns: number;
    column_widths: number[];
    level: number;
    alignment: "left" | "center" | "right" | "justify";
    source_refs: SourceRef[];
}
export interface StructuredPage {
    number: number;
    width: number;
    height: number;
    source_kind: "digital" | "scan" | "unknown";
    route: "native" | "local_ocr" | "vision" | "review";
    nodes: StructuredNode[];
}
export interface ReviewIssue {
    id: string;
    page: number;
    node_id: string | null;
    kind: string;
    message: string;
    blocking: boolean;
    status: "open" | "resolved";
    resolution_note: string;
    resolved_by: string | null;
    resolved_at: string | null;
}
export interface StructuredDocument {
    schema_version: 4;
    source_hash: string;
    pages: StructuredPage[];
    issues: ReviewIssue[];
    field_links: {
        label_node_id: string;
        value_node_id: string;
        group_id: string;
        status: "needs_review" | "reviewed";
    }[];
    layout: {
        margin_pt: number;
        font_size_pt: number;
        font_family:
            | "Noto Sans Devanagari"
            | "Mangal"
            | "Times New Roman"
            | "Arial";
    };
}
export function allNodes(nodes: StructuredNode[]): StructuredNode[] {
    return nodes.flatMap((node) => [
        node,
        ...allNodes(node.children),
        ...node.cells.flatMap((cell) => allNodes(cell.children)),
    ]);
}
export function updateNode(
    document: StructuredDocument,
    id: string,
    change: (node: StructuredNode) => void,
): StructuredDocument {
    const copy = structuredClone(document);
    const node = copy.pages
        .flatMap((page) => allNodes(page.nodes))
        .find((item) => item.id === id);
    if (!node) throw new Error("The selected node no longer exists.");
    change(node);
    return copy;
}

export function emptyParagraph(): StructuredNode {
    return {
        id: `human-${crypto.randomUUID()}`,
        type: "paragraph",
        runs: [],
        children: [],
        cells: [],
        rows: 0,
        columns: 0,
        column_widths: [],
        level: 2,
        alignment: "left",
        source_refs: [],
    };
}
export function appendTableRow(table: StructuredNode) {
    if (table.rows >= 1000) throw new Error("Row limit reached.");
    for (let column = 0; column < table.columns; column++)
        table.cells.push({
            row: table.rows,
            column,
            rowspan: 1,
            colspan: 1,
            header: false,
            children: [emptyParagraph()],
        });
    table.rows++;
}
export function appendTableColumn(table: StructuredNode) {
    if (table.columns >= 100) throw new Error("Column limit reached.");
    for (let row = 0; row < table.rows; row++)
        table.cells.push({
            row,
            column: table.columns,
            rowspan: 1,
            colspan: 1,
            header: false,
            children: [emptyParagraph()],
        });
    table.columns++;
    if (table.column_widths.length)
        table.column_widths.push(table.column_widths.at(-1)!);
}
export function mergeCells(
    table: StructuredNode,
    row: number,
    column: number,
    rowspan: number,
    colspan: number,
) {
    if (
        ![row, column, rowspan, colspan].every(Number.isInteger) ||
        row < 0 ||
        column < 0 ||
        rowspan < 1 ||
        colspan < 1 ||
        row + rowspan > table.rows ||
        column + colspan > table.columns
    )
        throw new Error("Select a rectangle inside the table.");
    const selected = table.cells.filter(
        (c) =>
            c.row < row + rowspan &&
            c.row + c.rowspan > row &&
            c.column < column + colspan &&
            c.column + c.colspan > column,
    );
    if (
        selected.some(
            (c) =>
                c.row < row ||
                c.column < column ||
                c.row + c.rowspan > row + rowspan ||
                c.column + c.colspan > column + colspan,
        )
    )
        throw new Error("The selection cuts through an existing merged cell.");
    const children = selected
        .sort((a, b) => a.row - b.row || a.column - b.column)
        .flatMap((c) => c.children);
    table.cells = table.cells.filter((c) => !selected.includes(c));
    table.cells.push({
        row,
        column,
        rowspan,
        colspan,
        header: selected.every((c) => c.header),
        children,
    });
}
export function splitCell(table: StructuredNode, row: number, column: number) {
    const cell = table.cells.find((c) => c.row === row && c.column === column);
    if (!cell)
        throw new Error("Select the top-left position of the merged cell.");
    table.cells = table.cells.filter((c) => c !== cell);
    for (let r = row; r < row + cell.rowspan; r++)
        for (let c = column; c < column + cell.colspan; c++)
            table.cells.push({
                row: r,
                column: c,
                rowspan: 1,
                colspan: 1,
                header: cell.header,
                children:
                    r === row && c === column
                        ? cell.children
                        : [emptyParagraph()],
            });
}
