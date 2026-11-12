import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(
    path.join(import.meta.dirname, "../src/features/docx-editor/dictation/dictationTransport.ts"),
    "utf8",
);
const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
const exports = {};
vm.runInNewContext(outputText, { exports });

test("embedded editor never falls back to an unauthenticated browser upload", () => {
    assert.equal(exports.resolveDictationTransport(false, true), "bridge-unavailable");
    assert.equal(exports.resolveDictationTransport(true, true), "native");
    assert.equal(exports.resolveDictationTransport(false, false), "browser");
});
