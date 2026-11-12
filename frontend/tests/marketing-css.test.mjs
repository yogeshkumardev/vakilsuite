import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const postcss = createRequire(require.resolve("next"))("postcss");

test("landing styles cannot leak into dashboard/auth headings or controls", () => {
    const css = readFileSync(new URL("../src/components/marketing/landing-page.css", import.meta.url), "utf8");
    postcss.parse(css).walkRules(rule => {
        if (rule.parent.type === "atrule" && /keyframes$/.test(rule.parent.name)) return;
        for (const selector of rule.selectors) assert.match(selector, /^\.landing-page(?:\s|>|$)/);
    });
});
