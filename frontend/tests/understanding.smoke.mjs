import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { evidence } from "./fixtures/understanding.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin))
    throw new Error("Localhost only");
const routeDirectory = new URL(
    "../src/app/understanding-smoke/",
    import.meta.url,
);
await mkdir(routeDirectory);
let browser;
try {
    await writeFile(
        new URL("page.tsx", routeDirectory),
        'export { default } from "../../../tests/fixtures/understanding";\n',
    );
    browser = await chromium.launch({
        headless: true,
        executablePath: process.env.CHROMIUM_PATH || undefined,
    });
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    let extracted = false,
        scenario = "normal",
        searches = 0,
        copies = 0,
        snapshots = 0;
    const preview = await readFile(process.env.PREVIEW_PNG);
    await context.route("**/api/v1/**", async (route) => {
        const request = route.request(),
            path = new URL(request.url()).pathname;
        const ok = (data) => route.fulfill({ json: { success: true, data } });
        if (path.endsWith("/preview"))
            return route.fulfill({ contentType: "image/png", body: preview });
        if (path.endsWith("/understanding") && scenario === "unsupported")
            return ok({
                revision: null,
                coverage: {
                    can_query: false,
                    can_create_typed_copy: false,
                    can_prepare_evidence_snapshot: false,
                },
                outcome: {
                    code: "encrypted_pdf",
                    status: "needs_review",
                    verified: false,
                    message:
                        "This PDF is password-protected or restricts extraction. Provide an authorized readable copy.",
                },
            });
        if (path.endsWith("/understanding") && scenario === "partial") {
            const partial = structuredClone(evidence);
            partial.revision.structure.pages[1].blocks = [];
            partial.revision.structure.pages[1].warnings = [
                "page_extraction_failed",
            ];
            partial.coverage = {
                ...partial.coverage,
                can_create_typed_copy: false,
                queryable_pages: [1],
                excluded_lines: 0,
                pages: [
                    {
                        number: 2,
                        status: "unavailable",
                        warnings: ["page_extraction_failed"],
                        excluded_lines: 0,
                    },
                ],
            };
            return ok(partial);
        }
        if (path.endsWith("/understanding"))
            return ok(
                extracted
                    ? evidence
                    : { revision: null, coverage: { can_query: false } },
            );
        if (path.endsWith("/processing-runs")) {
            assert.equal(
                request.postDataJSON().pipeline_version,
                "understanding",
            );
            extracted = true;
            return ok({ job_id: "job" });
        }
        if (path.endsWith("/jobs/job")) return ok({ status: "completed" });
        if (path.endsWith("/evidence-search")) {
            assert.deepEqual(request.postDataJSON(), {
                revision_id: "revision",
                query: "Section 101",
            });
            searches++;
            return ok({
                revision_id: "revision",
                matches: [
                    {
                        id: "match",
                        page: 1,
                        block_id: "p1-table",
                        bbox: [20, 100, 280, 180],
                        text: "Act: Example A / Section: 101",
                        warnings: ["unreviewed"],
                    },
                ],
                truncated: false,
            });
        }
        if (path.endsWith("/evidence-snapshot")) {
            assert.deepEqual(request.postDataJSON(), {
                document_ids: ["document"],
            });
            snapshots++;
            return ok({
                source_hash: "b".repeat(64),
                typed_approval_required: false,
            });
        }
        if (path.endsWith("/typed-copy")) {
            assert.deepEqual(request.postDataJSON(), {
                revision_id: "revision",
                parent_revision_id: null,
                parent_lock_version: null,
                parent_content_hash: null,
            });
            copies++;
            return ok({ typed_revision_id: "new-typed" });
        }
        return route.fulfill({
            status: 401,
            json: {
                success: false,
                error: { code: "UNAUTHORIZED", message: "Synthetic test" },
            },
        });
    });
    await page.goto(`${origin}/understanding-smoke`, {
        waitUntil: "networkidle",
    });
    await page.getByText("No extracted evidence.", { exact: true }).waitFor();
    await page
        .getByRole("button", { name: "Extract local evidence", exact: true })
        .click();
    await page.getByText("Sample North", { exact: true }).waitFor();
    assert.equal(await page.locator("table tr").count(), 4);
    assert.equal(await page.locator("table td").count(), 8);
    await page.getByAltText("Source page 1", { exact: true }).waitFor();
    assert.ok(
        await page.getByAltText("Source page 1").evaluate(async (image) => {
            await image.decode();
            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 120;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(image, 0, 0, 100, 120);
            return ctx
                .getImageData(0, 0, 100, 120)
                .data.some((v, i) => i % 4 !== 3 && v < 150);
        }),
    );
    await page
        .getByLabel("Search document evidence", { exact: true })
        .fill("Section 101");
    await page
        .getByRole("button", { name: "Search evidence", exact: true })
        .click();
    await page
        .getByText("Act: Example A / Section: 101", { exact: true })
        .waitFor();
    assert.equal(copies, 0);
    await page.screenshot({
        path: "/tmp/understanding-desktop.png",
        fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "evidence", exact: true }).click();
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
    );
    await page.screenshot({
        path: "/tmp/understanding-mobile.png",
        fullPage: true,
    });
    await page
        .getByRole("button", { name: "Show source p1-table", exact: true })
        .click();
    assert.ok(await page.getByAltText("Source page 1").isVisible());
    await page.screenshot({
        path: "/tmp/understanding-mobile-source.png",
        fullPage: true,
    });
    await page.getByLabel("Evidence page", { exact: true }).selectOption("2");
    await page.getByAltText("Source page 2").waitFor();
    const downloading = page.waitForEvent("download");
    await page
        .getByRole("button", {
            name: "Download evidence snapshot",
            exact: true,
        })
        .click();
    await downloading;
    page.once("dialog", (dialog) => dialog.accept());
    await page
        .getByRole("button", {
            name: "Create editable typed copy",
            exact: true,
        })
        .click();
    await page
        .getByRole("status")
        .filter({ hasText: "Typed copy ready" })
        .waitFor();
    assert.equal(searches, 1);
    assert.equal(copies, 1);
    assert.equal(snapshots, 1);
    scenario = "partial";
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText(/Evidence needs review/).waitFor();
    assert.ok(
        await page
            .getByRole("button", {
                name: "Create editable typed copy",
                exact: true,
            })
            .isDisabled(),
    );
    await page.getByLabel("Evidence page", { exact: true }).selectOption("2");
    await page.getByRole("tab", { name: "evidence", exact: true }).click();
    await page
        .getByText(
            "No usable text extracted on this page. The original may still contain information.",
            { exact: true },
        )
        .waitFor();
    await page.getByText(/Evidence needs review/).click();
    await page
        .getByText("Page 2: Page extraction could not be completed", {
            exact: true,
        })
        .waitFor();
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    );
    await page.screenshot({
        path: "/tmp/understanding-partial-mobile.png",
        fullPage: true,
    });
    scenario = "unsupported";
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText(/This PDF is password-protected/).waitFor();
    assert.ok(
        await page
            .getByRole("button", {
                name: "Create editable typed copy",
                exact: true,
            })
            .isDisabled(),
    );
    assert.ok(
        await page
            .getByRole("button", {
                name: "Download evidence snapshot",
                exact: true,
            })
            .isDisabled(),
    );
    assert.equal(
        await page
            .getByRole("button", { name: "Search evidence", exact: true })
            .count(),
        0,
    );
    assert.ok(
        await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
        ),
    );
    await page.screenshot({
        path: "/tmp/understanding-unavailable-mobile.png",
        fullPage: true,
    });
    assert.deepEqual(errors, []);
    console.log(
        JSON.stringify({
            searches,
            copies,
            snapshots,
            desktop: true,
            mobile: true,
            sourcePixels: true,
            partialAndUnsupported: true,
            errors,
        }),
    );
} finally {
    await browser?.close();
    await rm(routeDirectory, { recursive: true });
}
