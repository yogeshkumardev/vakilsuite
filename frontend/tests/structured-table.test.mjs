import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { structure } from "./fixtures/structured-document.mjs";
const source = await readFile(
    new URL("../src/features/documents/editor/structure.ts", import.meta.url),
    "utf8",
);
const output = ts.transpileModule(source, {
    compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
    },
}).outputText;
const {
    allNodes,
    appendTableColumn,
    appendTableRow,
    mergeCells,
    splitCell,
    updateNode,
} = await import(
    `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`
);

test("split and merge retain source IDs and text", () => {
    const table = structuredClone(structure.pages[0].nodes[1]);
    const before = allNodes([table]).map((n) => n.id);
    splitCell(table, 0, 0);
    assert.equal(table.cells.length, 6);
    mergeCells(table, 0, 0, 1, 3);
    assert.equal(table.cells.find((c) => c.row === 0).colspan, 3);
    assert.ok(before.every((id) => allNodes([table]).some((n) => n.id === id)));
});
test("partial merged-cell selections are rejected without changes", () => {
    const table = structuredClone(structure.pages[0].nodes[1]);
    const before = JSON.stringify(table);
    assert.throws(() => mergeCells(table, 0, 1, 2, 2), /cuts through/);
    assert.equal(JSON.stringify(table), before);
});
test("appended rows and columns explicitly represent empty cells", () => {
    const table = structuredClone(structure.pages[0].nodes[1]);
    appendTableRow(table);
    appendTableColumn(table);
    assert.equal(table.rows, 3);
    assert.equal(table.columns, 4);
    assert.equal(
        table.cells.reduce((n, c) => n + c.rowspan * c.colspan, 0),
        12,
    );
    assert.equal(table.column_widths.length, 4);
});
test("editing preserves immutable source evidence and original tree", () => {
    const edited = updateNode(structure, "value", (node) => {
        node.runs[0].text = "Reviewed";
    });
    assert.equal(
        allNodes(edited.pages[0].nodes).find((n) => n.id === "value").runs[0]
            .text,
        "Reviewed",
    );
    assert.equal(
        allNodes(structure.pages[0].nodes).find((n) => n.id === "value").runs[0]
            .text,
        "Original value",
    );
    assert.deepEqual(
        edited.pages[0].nodes[1].source_refs,
        structure.pages[0].nodes[1].source_refs,
    );
});
