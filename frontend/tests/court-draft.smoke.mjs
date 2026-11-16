// Synthetic browser E2E for the draft step: approved summary → generation → edit → compliance → DOCX.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, rm, writeFile } from "node:fs/promises";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3000";
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const routeDirectory = new URL("../src/app/court-draft-smoke/", import.meta.url);
const caseId = "11111111-1111-4111-8111-111111111111";
const runId = "22222222-2222-4222-8222-222222222222";
const draftId = "33333333-3333-4333-8333-333333333333";
const hash = "a".repeat(64);
await mkdir(routeDirectory);
let browser;
try {
  await writeFile(new URL("page.tsx", routeDirectory), 'export { default } from "../../../tests/fixtures/court-draft";\n');
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const page = await context.newPage();
  let draft = { id: draftId, case_id: caseId, summary_run_id: runId, draft_type: "regular_bail_483_bnss", blueprint_code: "allahabad_regular_bail_483_bnss", blueprint_version: 1, version: 1, status: "needs_review", content_hash: hash, rule_snapshot: {}, compliance_report: { overall: "warning", checks: [{ code: "placeholders", status: "warning", expected: "No unresolved placeholders", found: "Unresolved placeholder found", source: "Saved rule", locator: "Rule 1" }] }, stale_reason: null, prompt_version: "test", model: null, source_summary_hash: hash, created_at: "2026-11-15T00:00:00", updated_at: "2026-11-15T00:00:00", content: { components: [{ code: "application", paragraphs: [{ role: "body", text: "[● lawyer confirm karein ●] (facts)", editable: true, generation_slot: "facts" }, { role: "body", text: "[● lawyer confirm karein ●] (grounds)", editable: true, generation_slot: "grounds" }, { role: "prayer", text: "[● lawyer confirm karein ●] (prayer)", editable: true, generation_slot: "prayer" }] }] } };
  await context.route("**/api/v1/**", async route => {
    const request = route.request(); const path = new URL(request.url()).pathname.replace(/^\/api\/v1/, "");
    const ok = data => route.fulfill({ json: { success: true, data } });
    if (path === `/cases/${caseId}/draft-readiness`) return ok({ draft_type: "regular_bail_483_bnss", blueprint_code: "test", blueprint_version: 1, tier: "A", banner: "Approved", missing_inputs: [], missing_case_fields: [], missing_profile_fields: [], prefill: { case: {}, applicants: [], advocate: {} }, warnings: [] });
    if (path === `/cases/${caseId}/summary-runs`) return ok([{ id: runId, case_id: caseId, status: "completed", source_manifest_hash: hash, prompt_version: "test", policy_version: 1, source_count: 1, output_language: "en-IN", created_at: "2026-11-15T00:00:00", completed_at: "2026-11-15T00:00:00" }]);
    if (path === `/cases/${caseId}/summary-runs/${runId}`) return ok({ id: runId, case_id: caseId, status: "completed", result_hash: hash, source_manifest_hash: hash, prompt_version: "test", policy_version: 1, source_count: 1, output_language: "en-IN", created_at: "2026-11-15T00:00:00", completed_at: "2026-11-15T00:00:00", review_version: 1, decisions: [] });
    if (path === `/cases/${caseId}/court-drafts` && request.method() === "POST") return ok(draft);
    if (path.endsWith(`/court-drafts/${draftId}/generate`)) return ok({ id: "44444444-4444-4444-8444-444444444444", status: "queued", draft_id: draftId });
    if (path === "/jobs/44444444-4444-4444-8444-444444444444") return ok({ id: "44444444-4444-4444-8444-444444444444", job_type: "court_draft_generation", status: "succeeded", case_id: caseId, attempt_count: 1, max_attempts: 1, result_summary: {}, error_message: null, queued_at: "2026-11-15T00:00:00", started_at: null, completed_at: "2026-11-15T00:00:01", created_at: "2026-11-15T00:00:00", updated_at: "2026-11-15T00:00:01" });
    if (path === `/cases/${caseId}/court-drafts/${draftId}` && request.method() === "GET") return ok(draft);
    if (path === `/cases/${caseId}/court-drafts/${draftId}` && request.method() === "PATCH") { const edit = request.postDataJSON().edits[0]; draft.content.components[0].paragraphs[0].text = edit.text; return ok(draft); }
    if (path.endsWith(`/court-drafts/${draftId}/exports`)) return ok({ id: "55555555-5555-4555-8555-555555555555", status: "queued", draft_id: draftId, artifact_ready: false });
    if (path === "/jobs/55555555-5555-4555-8555-555555555555") return ok({ id: "55555555-5555-4555-8555-555555555555", job_type: "court_draft_export", status: "succeeded", case_id: caseId, attempt_count: 1, max_attempts: 1, result_summary: {}, error_message: null, queued_at: "2026-11-15T00:00:00", started_at: null, completed_at: "2026-11-15T00:00:01", created_at: "2026-11-15T00:00:00", updated_at: "2026-11-15T00:00:01" });
    if (path.endsWith("/download")) return route.fulfill({ headers: { "Content-Disposition": "attachment; filename=test.docx" }, body: "docx" });
    return route.fulfill({ status: 404, json: { success: false, error: { code: "TEST", message: `Unmocked ${path}` } } });
  });
  await page.goto(`${origin}/court-draft-smoke`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Create reviewable draft" }).click();
  await page.getByRole("button", { name: "Generate facts, grounds and prayer" }).click();
  await page.getByRole("button", { name: "Load generated sections" }).click();
  await page.getByRole("textbox", { name: /body \(AI draft/ }).first().fill("Lawyer reviewed facts.");
  await page.getByRole("button", { name: "Save section edits" }).click();
  await page.getByLabel(/I reviewed the compliance warnings/).check();
  await page.getByRole("button", { name: "Prepare DOCX download" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download DOCX" }).click();
  await download;
  await context.close();
} finally { if (browser) await browser.close(); await rm(routeDirectory, { recursive: true, force: true }); }
