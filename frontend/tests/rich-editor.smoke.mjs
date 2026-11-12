// Synthetic content only. Run against the local dev server; no paid APIs.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("Localhost only");
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${origin}/spike-editor`);
    const editor = page.locator(".editor-content");
    await editor.waitFor();
    await page.evaluate(() => document.fonts.load('16px "Noto Sans Devanagari"', "न्यायालय"));
    assert.equal(await page.evaluate(() => document.fonts.check('16px "Noto Sans Devanagari"', "न्यायालय")), true);
    for (const width of [1366, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 900 });
        const heights = [];
        for (const name of ["Home", "Insert", "Layout", "Export", "Home"]) {
            await page.getByRole("tab", { name, exact: true }).click();
            heights.push((await page.locator(".editor-toolbar-ribbon").boundingBox()).height);
        }
        assert.equal(new Set(heights).size, 1, `Ribbon changed height at ${width}: ${heights}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Page overflow at ${width}`);
        assert.equal(await page.locator('[inert] button').first().evaluate((button) => button.closest('[inert]') !== null), true);
    }
    await page.setViewportSize({ width: 1366, height: 900 });
    const first = editor.locator("p").first();
    await first.click();
    await page.getByTitle("Line Spacing", { exact: true }).selectOption("2");
    await page.waitForFunction(() => document.querySelector('.editor-content p').style.lineHeight === '2');
    await page.waitForFunction(() => sessionStorage.getItem('vakilsuite_spike_editor_v1')?.includes('"lineSpacing":"2"'));
    await page.getByRole("button", { name: "Reload saved" }).click();
    await page.waitForFunction(() => document.querySelector('.editor-content p').style.lineHeight === '2');
    await editor.locator("li").first().click();
    await page.getByTitle("Line Spacing", { exact: true }).selectOption("1.15");
    await page.waitForFunction(() => document.querySelector('.editor-content li').style.lineHeight === '1.15');
    assert.equal(await editor.locator("p").first().evaluate((p) => p.style.lineHeight), "2");
    await first.click();
    await page.waitForFunction(() => document.querySelector('select[title="Line Spacing"]').value === '2');
    assert.equal(await page.getByTitle("Line Spacing", { exact: true }).inputValue(), "2");
    assert.deepEqual(errors, []);
    console.log("PASS: desktop/tablet/phone ribbon; Hindi font load; paragraph/list spacing; save/reload; toolbar selection");
} finally {
    await browser.close();
}
