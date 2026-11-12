// Real components, isolated synthetic API responses; never mutates real case data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const fixture = JSON.parse(await readFile(new URL("./fixtures/baseline.json", import.meta.url), "utf8"));
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
try {
  for (const width of [1366, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    let removed = false, deletes = 0, failDelete = true, editable = true, owner = true;
    const item = { id: "55555555-5555-4555-8555-555555555555", lawyer_id: fixture.user.id, case_title: "Synthetic action case", case_type: "other", status: "active", stage: "filing", bench_type: "single_bench", petitioner_name: "Synthetic", respondent_name: "State", parties: [], sections: [], case_numbers: [], next_hearing_date: null };
    await context.route("**/*", async route => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace(/^\/api\/v1/, "");
      const ok = data => route.fulfill({ json: { success: true, data } });
      const fail = (status, message) => route.fulfill({ status, json: { success: false, error: { code: "TEST_ERROR", message } } });
      if (url.pathname.startsWith("/api/v1/")) {
        if (path === "/auth/refresh") return ok({ access_token: "synthetic", user: fixture.user, session_id: fixture.session_id });
        if (path === "/users/me") return ok({ ...fixture.user, id: owner ? fixture.user.id : "different-user" });
        if (path === "/cases") return ok({ cases: removed ? [] : [item], pagination: { page: 1, limit: 20, total: removed ? 0 : 1, total_pages: 1 } });
        if (path === `/cases/${item.id}/permissions`) return ok({ can_edit: editable });
        if (path === `/cases/${item.id}/soft-delete`) {
          deletes++;
          if (failDelete) return fail(503, "Synthetic failure: retry safely");
          removed = true; return ok({});
        }
        if (path === `/cases/${item.id}`) {
          if (route.request().method() === "PATCH") Object.assign(item, route.request().postDataJSON());
          if (route.request().method() === "DELETE") { item.status = "archived"; return ok({}); }
          return ok({ case: item });
        }
        if (path === `/cases/${item.id}/sections/history`) return ok({ sections: [] });
        return fail(404, `Unmocked path ${path}`);
      }
      if (url.origin === origin) return route.continue();
      return route.abort();
    });
    await page.goto(`${origin}/cases`);
    await page.getByRole("link", { name: "Edit", exact: true }).click().catch(async error => {
      console.error("Browser diagnostic:", page.url(), await page.locator("body").innerText(), errors);
      throw error;
    });
    await page.getByLabel("Case title", { exact: true }).fill("Updated synthetic case");
    await page.getByRole("button", { name: "Save changes" }).click();
    await page.getByRole("heading", { name: "Updated synthetic case" }).waitFor();
    await page.getByRole("button", { name: "Archive", exact: true }).click();
    await page.getByRole("button", { name: "Archive case", exact: true }).click();
    await page.waitForURL("**/cases");
    assert.equal(item.status, "archived");
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    const modal = page.getByRole("dialog");
    await modal.waitFor();
    assert.match(await modal.getAttribute("class"), /border-red-500/);
    await modal.getByRole("button", { name: "Cancel" }).click();
    assert.equal(deletes, 0);
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await modal.getByRole("button", { name: "Delete case & documents" }).click();
    await modal.getByRole("alert").waitFor();
    assert.equal(removed, false);
    failDelete = false;
    await modal.getByRole("button", { name: "Delete case & documents" }).click();
    await page.getByText("No cases found", { exact: true }).waitFor();
    assert.equal(deletes, 2);
    removed = false; editable = false; owner = false;
    await page.reload();
    await page.locator("tbody a").filter({ hasText: item.case_title }).waitFor();
    assert.equal(await page.getByRole("button", { name: "Delete", exact: true }).count(), 0);
    assert.equal(await page.getByRole("link", { name: "Edit", exact: true }).count(), 0);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Case actions passed: ${width}px edit, archive, delete cancel/error/retry, read-only controls.`);
  }
} finally { await browser.close(); }
