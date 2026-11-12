// Run against a localhost Next dev server. A synthetic route is removed in finally.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { revision as initial } from "./fixtures/structured-document.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw new Error("Smoke test requires a localhost dev server");
const routeDirectory = new URL(
    "../src/app/structured-review-smoke/",
    import.meta.url,
);
await mkdir(routeDirectory); // Refuse to overwrite an existing application route.
let browser;
try {
    await writeFile(
        new URL("page.tsx", routeDirectory),
        'export { default } from "../../../tests/fixtures/structured-review";\n',
    );
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || undefined,
    });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
    });
    const errors = [];
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    let saved = structuredClone(initial),
        patches = 0,
        approvals = 0,
        previewRequests = 0;
    const preview = await readFile(process.env.PREVIEW_PNG);
    await context.route("**/api/v1/**", async (route) => {
        const request = route.request(),
            url = new URL(request.url());
        if (url.pathname.endsWith("/auth/refresh"))
            return route.fulfill({ json: { success: true, data: { access_token: "synthetic-refreshed-token" } } });
        if (url.pathname.endsWith("/preview")) {
            assert.equal(url.searchParams.get("source_hash"), initial.canonical_structure.source_hash);
            if (++previewRequests === 1) return route.fulfill({ status: 401, body: "Expired" });
            return route.fulfill({ contentType: "image/png", body: preview });
        }
        if (url.pathname.endsWith("/typed-version/approve")) {
            const expected = request.postDataJSON();
            assert.deepEqual(expected, {
                revision_id: saved.id,
                lock_version: saved.lock_version,
                content_hash: saved.content_hash,
            });
            assert.ok(
                saved.canonical_structure.issues.every(
                    (i) => i.status === "resolved",
                ),
            );
            approvals++;
            saved.status = "approved";
            return route.fulfill({
                json: {
                    success: true,
                    data: { revision: saved, event_id: "event" },
                },
            });
        }
        if (url.pathname.endsWith("/typed-version")) {
            if (request.method() === "PATCH") {
                const payload = request.postDataJSON();
                assert.equal(payload.lock_version, saved.lock_version);
                assert.equal(payload.content_markdown, undefined);
                patches++;
                saved = {
                    ...saved,
                    lock_version: saved.lock_version + 1,
                    content_hash: String(patches).repeat(64),
                    canonical_structure: payload.canonical_structure,
                };
            }
            return route.fulfill({
                json: { success: true, data: { typed_revision: saved } },
            });
        }
        if (url.pathname.endsWith("/download/docx"))
            return route.fulfill({
                body: "synthetic DOCX response",
                contentType:
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers: {
                    "X-Document-Revision": saved.id,
                    "Content-Disposition": "attachment; filename=sample.docx",
                },
            });
        return route.fulfill({
            status: 401,
            json: {
                success: false,
                error: { code: "UNAUTHORIZED", message: "Synthetic test" },
            },
        });
    });
    await page.goto(`${origin}/structured-review-smoke`, {
        waitUntil: "networkidle",
    });
    await page.getByAltText("Original document page 1").waitFor();
    assert.ok(await page.evaluate(async () => {
        await document.fonts.load('16px "Noto Sans Devanagari"');
        return document.fonts.check('16px "Noto Sans Devanagari"');
    }));
    assert.ok(
        await page
            .getByRole("button", { name: "Approve saved content", exact: true })
            .isDisabled(),
    );
    await page
        .getByRole("button", { name: "Edit table table", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Split selected cell", exact: true })
        .click();
    await page.getByLabel("Columns to merge", { exact: true }).fill("3");
    await page
        .getByRole("button", { name: "Merge selected cells", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Close selected text", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Edit text value", exact: true })
        .click();
    await page
        .getByRole("textbox", { name: "Selected text", exact: true })
        .fill("Lawyer reviewed value");
    const scroll = await page.getByTestId("structured-document-scroll").boundingBox();
    const inspector = await page.getByRole("region", { name: "Selected block", exact: true }).boundingBox();
    assert.ok(scroll.y + scroll.height <= inspector.y + 1, "editor inspector overlaps the document viewport");
    await page
        .getByRole("textbox", { name: "Selected text", exact: true })
        .press("Control+a");
    await page.getByRole("button", { name: "bold", exact: true }).click();
    await page
        .getByRole("button", { name: "Save document", exact: true })
        .click();
    await page.getByRole("status").filter({ hasText: "Saved" }).waitFor();
    assert.equal(patches, 1);
    const table = saved.canonical_structure.pages[0].nodes[1];
    assert.equal(table.cells.find((c) => c.row === 0).colspan, 3);
    const value = table.cells
        .flatMap((c) => c.children)
        .find((n) => n.id === "value");
    assert.equal(
        value.runs.map((r) => r.text).join(""),
        "Lawyer reviewed value",
    );
    assert.ok(value.runs.some((r) => r.bold));
    await page
        .getByRole("button", { name: "Close selected text", exact: true })
        .click();
    await page
        .getByLabel("Resolution note layout-1", { exact: true })
        .fill("Compared with original");
    await page.getByLabel("Reviewed against source", { exact: true }).check();
    await page
        .getByRole("button", { name: "Approve saved content", exact: true })
        .click();
    await page
        .getByRole("button", { name: "Edit approved revision", exact: true })
        .waitFor();
    assert.equal(approvals, 1);
    assert.equal(patches, 2);
    const downloading = page.waitForEvent("download");
    await page
        .getByRole("button", { name: "Download approved DOCX", exact: true })
        .click();
    await downloading;
    await page.getByTestId("structured-document-scroll").evaluate((element) => {
        element.scrollTop = 0;
    });
    assert.ok(
        await page
            .getByText("Lawyer reviewed value", { exact: true })
            .isVisible(),
    );
    await page.screenshot({
        path: "/tmp/legal-document-editor-desktop.png",
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "source", exact: true }).click();
    assert.ok(await page.getByAltText("Original document page 1").isVisible());
    await page.screenshot({
        path: "/tmp/legal-document-editor-mobile-source.png",
        fullPage: true,
    });
    await page.getByRole("tab", { name: "document", exact: true }).click();
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    );
    await page.screenshot({
        path: "/tmp/legal-document-editor-mobile.png",
        fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
        JSON.stringify({
            patches,
            approvals,
            desktop: true,
            mobile: true,
            consoleErrors: errors.length,
        }),
    );
} finally {
    await browser?.close();
    await rm(routeDirectory, { recursive: true });
}
