// Run from any directory. Generated copies keep the three repositories standalone.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(resolve(root, "frontend/package.json"));
const { default: openapiTS, astToString } = require("openapi-typescript");
const { stdout: schemaText } = await promisify(execFile)(resolve(root, "backend/.venv/bin/python"), ["scripts/export_openapi.py"], {
    cwd: resolve(root, "backend"), encoding: "utf8",
    env: { ...process.env, SENTRY_DSN: "", DATABASE_URL: "postgresql+asyncpg://contract:contract@127.0.0.1:5432/contract" },
});
const schema = JSON.parse(schemaText);
const hash = createHash("sha256").update(schemaText).digest("hex");
const types = `// Generated from API v1 by scripts/sync-api-contract.mjs. Do not edit.\n// OpenAPI SHA-256: ${hash}\n\n` + astToString(await openapiTS(schema));
const artifacts = new Map([
    ["contracts/openapi.json", schemaText],
    ["contracts/api.d.ts", types],
    ["frontend/src/types/generated-api.ts", types],
    ["android-app/src/types/generated-api.ts", types],
]);
const fixture = await readFile(resolve(root, "contracts/fixtures/baseline.json"), "utf8");
for (const repo of ["backend", "frontend", "android-app"]) {
    artifacts.set(`${repo}/tests/fixtures/baseline.json`, fixture);
}
let stale = false;
for (const [name, content] of artifacts) {
    const path = resolve(root, name);
    if (process.argv.includes("--check")) {
        if (await readFile(path, "utf8").catch(() => "") !== content) {
            console.error(`Contract drift: ${name}`);
            stale = true;
        }
    } else {
        await mkdir(dirname(path), { recursive: true });
        await writeFile(path, content);
        console.log(`Generated ${name}`);
    }
}
if (stale) process.exitCode = 1;
else console.log("API contract synchronized.");
