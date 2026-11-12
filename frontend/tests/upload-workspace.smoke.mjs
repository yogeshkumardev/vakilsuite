// Real application routes with synthetic APIs; never uploads a real case document.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { evidence } from "./fixtures/understanding.mjs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH,
});
try {
    const context = await browser.newContext({
        viewport: { width: 1366, height: 900 },
    });
    const page = await context.newPage();
    const errors = [],
        unexpected = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const filename = "Hindi-English-annexure_".repeat(12) + ".pdf";
    const caseData = {
        id: "case",
        case_title: "John Doe Bail Application 2026 ".repeat(6),
        case_type: "bail_application",
        status: "active",
        stage: "filing",
        parties: [],
        sections: [],
        case_numbers: [],
    };
    let uploaded = false,
        stored = false,
        mode = "put-fails",
        confirms = 0,
        puts = 0,
        presigns = 0;
    const document = {
        id: "document",
        case_id: "case",
        original_filename: filename,
        display_name: null,
        mime_type: "application/pdf",
        document_type: "other",
        file_size_bytes: 2048,
        page_count: 2,
        processing_status: "ready_for_review",
        ocr_status: "pending",
        review_status: "pending",
        upload_status: "uploaded",
        active_processing_run_id: "run",
    };
    const run = {
        id: "run",
        pipeline_version: "digital_understanding_v1",
        status: "ready_for_review",
        total_pages: 2,
        completed_pages: 2,
        pages: [],
    };
    const preview = await readFile(process.env.PREVIEW_PNG);
    await context.route("**/api/v1/**", async (route) => {
        const req = route.request(),
            path = new URL(req.url()).pathname;
        const ok = (data) => route.fulfill({ json: { success: true, data } });
        const fail = (status, message) =>
            route.fulfill({
                status,
                json: {
                    success: false,
                    error: { code: "TEST_FAILURE", message },
                },
            });
        if (path.endsWith("/auth/refresh"))
            return ok({ access_token: "synthetic-token" });
        if (path.endsWith("/users/me"))
            return ok({
                id: "user",
                full_name: "Test Lawyer",
                email: "test@example.invalid",
                role: "lawyer",
            });
        if (path.includes("/notifications"))
            return ok({ notifications: [], unread_count: 0 });
        if (path === "/api/v1/cases" && req.method() === "POST") {
            assert.equal(
                req.postDataJSON().case_title,
                caseData.case_title.trim(),
            );
            return ok({ case: caseData });
        }
        if (path === "/api/v1/cases/case") return ok({ case: caseData });
        if (path.endsWith("/cases/case/documents"))
            return ok({ documents: uploaded ? [document] : [] });
        if (path.endsWith("/presign")) {
            presigns++;
            return ok({
                document_id: "document",
                upload_url: `${origin}/api/v1/synthetic-storage`,
            });
        }
        if (path.endsWith("/synthetic-storage")) {
            puts++;
            if (mode === "put-fails") return fail(500, "Storage failed");
            stored = true;
            return route.fulfill({ status: 200, body: "" });
        }
        if (path.endsWith("/confirm-upload")) {
            assert.ok(stored);
            assert.equal(req.postDataJSON().pipeline_version, "understanding");
            confirms++;
            if (mode === "confirm-fails")
                return fail(503, "Queue temporarily unavailable");
            uploaded = true;
            return ok({ document, processing_run: run });
        }
        if (path === "/api/v1/documents/document") return ok({ document });
        if (path.endsWith("/typed-version")) return fail(404, "No typed copy");
        if (path.endsWith("/processing-progress"))
            return ok({ processing_run: run });
        if (path.endsWith("/view-url"))
            return ok({ url: "about:blank", expires_at: "2030-01-01" });
        if (path.endsWith("/understanding")) return ok(evidence);
        if (path.endsWith("/preview"))
            return route.fulfill({ contentType: "image/png", body: preview });
        unexpected.push(`${req.method()} ${path}`);
        return fail(404, "Unexpected synthetic request");
    });
    await page.goto(`${origin}/cases/new`, { waitUntil: "networkidle" });
    await page
        .getByPlaceholder("e.g. John Doe Bail Application 2026")
        .fill(caseData.case_title.trim());
    await page
        .getByPlaceholder("Full name", { exact: true })
        .fill("Test Petitioner");
    await page
        .getByRole("button", { name: "Create Case", exact: true })
        .click();
    await page.waitForURL(`${origin}/cases/case`);
    await page.goto(`${origin}/cases/case?tab=documents`, {
        waitUntil: "networkidle",
    });
    const noOverflow = async () => {
        if (page.viewportSize().width < 768)
            assert.equal(
                await page
                    .getByRole("complementary", {
                        name: "Primary navigation",
                        includeHidden: true,
                    })
                    .isVisible(),
                false,
                "closed mobile navigation overlaps content",
            );
        assert.ok(
            await page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "page overflow",
        );
    };
    assert.equal(await page.getByLabel("Processing mode").count(), 0);
    const file = {
        name: filename,
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF synthetic upload"),
    };
    await page.getByLabel("Choose document").setInputFiles(file);
    await page.getByText("R2 upload failed: 500", { exact: true }).waitFor();
    assert.equal(confirms, 0);
    assert.equal(
        await page.getByRole("button", { name: "Retry confirmation" }).count(),
        0,
    );
    await noOverflow();
    mode = "confirm-fails";
    await page.getByLabel("Choose document").setInputFiles(file);
    await page.getByRole("button", { name: "Retry confirmation" }).waitFor();
    assert.equal(confirms, 1);
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await page.screenshot({
        path: "/tmp/upload-retry-mobile.png",
        fullPage: true,
    });
    mode = "success";
    await page.getByRole("button", { name: "Retry confirmation" }).click();
    await page.waitForURL(`${origin}/cases/case/documents/document`);
    assert.equal(puts, 2);
    assert.equal(presigns, 2);
    assert.equal(confirms, 2);
    // Upload opens structured evidence directly without a pipeline selector.
    await page.getByText("Sample North", { exact: true }).waitFor();
    await noOverflow();
    await page.screenshot({
        path: "/tmp/upload-workspace-mobile.png",
        fullPage: true,
    });
    await page.getByRole("button", { name: "Processing", exact: true }).click();
    await page
        .getByRole("region", { name: "Local evidence processing" })
        .waitFor();
    assert.equal(await page.getByText(/Google Document AI/).count(), 0);
    await page
        .getByRole("button", { name: "Open information", exact: true })
        .click();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.getByAltText("Source page 1", { exact: true }).waitFor();
    await noOverflow();
    await page.screenshot({
        path: "/tmp/upload-workspace-desktop.png",
        fullPage: true,
    });
    await page
        .getByRole("link", { name: "All Documents", exact: true })
        .click();
    await page
        .getByRole("link", { name: new RegExp("Hindi-English-annexure") })
        .waitFor();
    for (const width of [1366, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        await noOverflow();
        await page.screenshot({
            path: `/tmp/upload-list-${width}.png`,
            fullPage: true,
        });
    }
    assert.deepEqual(unexpected, []);
    assert.deepEqual(errors, []);
    console.log(
        JSON.stringify({
            createCase: true,
            uploadFailures: true,
            confirmationRetry: true,
            canonicalWorkspace: true,
            localPipeline: true,
            widths: [1366, 768, 390, 320],
            errors,
        }),
    );
} finally {
    await browser.close();
}
