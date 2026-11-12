// Reproducible, non-destructive S00 checks. Database integration remains opt-in.
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const steps = [
    [".", process.execPath, ["scripts/check-project-index.mjs"]],
    [".", process.execPath, ["scripts/sync-api-contract.mjs", "--check"]],
    ["backend", ".venv/bin/ruff", ["check", "app", "tests", "scripts"]],
    ["backend", ".venv/bin/pytest", ["-q"]],
    ["frontend", "pnpm", ["lint"]],
    ["frontend", "pnpm", ["typecheck"]],
    ["frontend", "pnpm", ["test"]],
    ["android-app", "pnpm", ["lint"]],
    ["android-app", "pnpm", ["typecheck"]],
    ["android-app", "pnpm", ["test"]],
];
if (process.argv.includes("--build")) steps.push(["frontend", "pnpm", ["build"]]);
for (const [directory, command, args] of steps) {
    console.log(`\n[${directory}] ${command} ${args.join(" ")}`);
    const code = await new Promise((resolveExit, reject) => {
        const child = spawn(command, args, { cwd: resolve(root, directory), stdio: "inherit" });
        child.on("error", reject);
        child.on("close", (code) => resolveExit(code ?? 1));
    });
    if (code) process.exit(code);
}
console.log("\nS00 automated checks passed. Live PostgreSQL/R2/Android acceptance is separate.");
