import { copyFile, mkdir, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const editorReactDir = resolve(rootDir, "packages/docx-editor/packages/react");
const requireFromEditor = createRequire(resolve(editorReactDir, "package.json"));

let coreEntry;
try {
    coreEntry = requireFromEditor.resolve("@schnsrw/core");
} catch {
    throw new Error(
        "@schnsrw/core is not installed for the shared DOCX editor. Run pnpm install in packages/docx-editor first.",
    );
}

const coreDir = resolve(dirname(coreEntry), "..");
const source = resolve(coreDir, "wasm/s1engine_wasm_bg.wasm");
const target = resolve(coreDir, "dist/s1engine_wasm_bg.wasm");

const sourceStats = await stat(source).catch(() => null);
if (!sourceStats) {
    throw new Error(`Missing DOCX conversion WASM asset: ${source}`);
}

const targetStats = await stat(target).catch(() => null);
if (!targetStats || targetStats.size !== sourceStats.size) {
    await mkdir(dirname(target), { recursive: true });
    await copyFile(source, target);
    console.log("Prepared shared DOCX editor WASM asset.");
}
