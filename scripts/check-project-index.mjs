// Read-only local link checks for the curated navigation documents.
// Supports inline Markdown links with simple or <angle-wrapped> destinations.
// External URLs and anchors are intentionally not fetched/validated.
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const documents = [
  'AGENTS.md',
  'PROJECT_INDEX.md',
  'backend/PROJECT_INDEX.md',
  'frontend/PROJECT_INDEX.md',
  'android-app/PROJECT_INDEX.md',
  'backend/CLAUDE.md',
  'frontend/CLAUDE.md',
  'contracts/README.md',
  ...['backend', 'web', 'android'].map(
    (app) => `.codex/skills/vakilsuite-${app}-development/SKILL.md`,
  ),
];

let failures = 0;
let checked = 0;
for (const document of documents) {
  const absolute = resolve(root, document);
  let source;
  try {
    source = await readFile(absolute, 'utf8');
  } catch {
    console.error(`Missing navigation document: ${document}`);
    failures++;
    continue;
  }
  // Exclude code blocks so example links are not interpreted as navigation.
  source = source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
  for (const match of source.matchAll(/\]\((?:<([^>]+)>|([^\s)]+))\)/g)) {
    const destination = match[1] ?? match[2];
    if (/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(destination)) continue;
    const path = destination.split(/[?#]/, 1)[0];
    if (!path) continue;
    checked++;
    try {
      await access(resolve(dirname(absolute), decodeURIComponent(path)));
    } catch {
      console.error(`Broken local link: ${document} -> ${destination}`);
      failures++;
    }
  }
}

if (failures) {
  console.error(`${failures} navigation problem(s).`);
  process.exitCode = 1;
} else {
  console.log(`Navigation checked: ${documents.length} documents, ${checked} local links.`);
}
