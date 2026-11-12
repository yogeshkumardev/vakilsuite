// Actual routes/components, synthetic API/storage. No real documents or credentials.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const fixture = JSON.parse(await readFile(new URL("./fixtures/baseline.json", import.meta.url), "utf8"));
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
    for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();
        const errors = [], unexpected = [], uploadIds = [];
        page.on("pageerror", (error) => errors.push(error.message));
        let uploaded = false, stored = false, puts = 0, confirms = 0, canEdit = true;
        const document = fixture.confirm_response.data.document;
        const caseId = document.case_id;
        const item = { id: caseId, lawyer_id: fixture.user.id, case_title: "Synthetic baseline case", case_type: "other", status: "active", stage: "filing", bench_type: "single_bench", petitioner_name: "Synthetic", respondent_name: "State", parties: [], sections: [], case_numbers: [], next_hearing_date: null };
        await context.route("**/*", async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.origin !== origin) return route.abort();
            if (url.pathname === "/synthetic-upload") {
                puts++;
                if (puts === 1) return route.fulfill({ status: 503 });
                stored = true;
                return route.fulfill({ status: 200 });
            }
            if (url.pathname === "/synthetic-original") return route.fulfill({ contentType: "text/plain", body: "Synthetic original fixture" });
            if (!url.pathname.startsWith("/api/v1/")) return route.continue();
            const path = url.pathname.slice("/api/v1".length);
            const ok = (data) => route.fulfill({ json: { success: true, data } });
            const denied = () => route.fulfill({ status: 403, json: { success: false, error: { code: "AUTH_FORBIDDEN", message: "Read-only case", details: {} } } });
            if (["/auth/login", "/auth/refresh"].includes(path)) return ok({ access_token: "synthetic-only", token_type: "bearer", session_id: fixture.session_id, user: fixture.user });
            if (path === "/users/me") return ok(fixture.user);
            if (path === "/cases") return ok({ cases: [item], pagination: { page: 1, limit: 20, total: 1, total_pages: 1 } });
            if (path === `/cases/${caseId}`) return ok({ case: item });
            if (path === `/cases/${caseId}/permissions`) return ok({ can_edit: canEdit });
            if (path === `/cases/${caseId}/sections/history`) return ok({ sections: [] });
            if (path === `/cases/${caseId}/documents`) return ok({ documents: uploaded ? [document] : [] });
            if (path === `/cases/${caseId}/documents/presign`) {
                if (!canEdit) return denied();
                const body = request.postDataJSON();
                assert.match(body.client_upload_id, /^[a-f0-9-]{36}$/);
                uploadIds.push(body.client_upload_id);
                return ok({ ...fixture.presign_response.data, upload_url: `${origin}/synthetic-upload` });
            }
            if (path === `/documents/${document.id}/confirm-upload`) {
                assert.deepEqual(request.postDataJSON(), {});
                assert.equal(stored, true);
                confirms++;
                if (confirms === 1) return route.fulfill({ status: 422, json: { success: false, error: { code: "VALIDATION_ERROR", message: "Synthetic confirmation interruption", details: {} } } });
                uploaded = true;
                return ok(fixture.confirm_response.data);
            }
            if (path === `/documents/${document.id}`) return ok(fixture.confirm_response.data);
            if (path === `/documents/${document.id}/view-url`) return ok({ ...fixture.view_response.data, url: `${origin}/synthetic-original` });
            unexpected.push(`${request.method()} ${path}`);
            return route.fulfill({ status: 404, json: { success: false, error: { code: "NOT_FOUND", message: "No S00 endpoint", details: {} } } });
        });
        await page.goto(`${origin}/login`);
        await page.locator('input[type="email"]').fill(fixture.user.email);
        await page.locator('input[type="password"]').fill("synthetic-test-password");
        await page.locator('button[type="submit"]').click();
        await page.waitForURL("**/dashboard");
        await page.goto(`${origin}/cases/${caseId}?tab=documents`);
        await page.getByLabel("Choose document").setInputFiles({ name: "synthetic-scan.pdf", mimeType: "application/pdf", buffer: Buffer.alloc(1200, "x") });
        await page.getByRole("button", { name: "Retry upload", exact: true }).click();
        await page.getByRole("button", { name: "Retry confirmation", exact: true }).click();
        await page.waitForURL(`**/documents/${document.id}`);
        assert.equal(puts, 2);
        assert.equal(confirms, 2);
        assert.equal(new Set(uploadIds).size, 1);
        await page.getByRole("link", { name: "Open / download original" }).waitFor();
        assert.equal(await page.getByRole("link", { name: "Open / download original" }).getAttribute("href"), `${origin}/synthetic-original`);
        await page.getByRole("link", { name: "Back to documents" }).click();
        await page.getByText("Uploaded", { exact: true }).waitFor();
        for (const path of ["/cause-list", `/cases/${caseId}/context`, `/cases/${caseId}/drafts/example`, `/cases/${caseId}/courtroom`]) {
            await page.goto(origin + path);
            await page.getByRole("heading", { name: "Feature not available yet" }).waitFor();
        }
        await page.goto(`${origin}/cases/${caseId}?tab=context`);
        await page.getByText(item.case_title, { exact: true }).first().waitFor();
        canEdit = false;
        await page.goto(`${origin}/cases/${caseId}/documents`);
        await page.getByText("Read-only access. You can view original uploaded files.").waitFor();
        assert.equal(await page.getByLabel("Choose document").count(), 0);
        assert.equal(await page.getByRole("button", { name: "Delete document" }).count(), 0);
        assert.deepEqual(unexpected, []);
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`Baseline smoke passed: ${viewport.width}px login, retry, confirm, original, legacy gates, read-only UI.`);
    }
} finally {
    await browser.close();
}
