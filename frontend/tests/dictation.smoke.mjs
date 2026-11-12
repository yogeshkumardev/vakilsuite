// Synthetic speech only; sockets/auth are intercepted. No provider calls.
import assert from "node:assert/strict";
import { chromium } from "playwright";
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:3001";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("Localhost only");
const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
});
try {
    const context = await browser.newContext({ permissions: ["microphone"], viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let sentAudio = 0, connections = 0, cancelled = 0;
    await page.route("**/auth/refresh", (route) => route.fulfill({json: {success: true, data: {access_token: "offline-test-token"}}}));
    await page.routeWebSocket("**/dictation/realtime", (ws) => {
        connections++;
        let requestId;
        const send = (fields) => ws.send(JSON.stringify({ version: 1, requestId, ...fields }));
        ws.onMessage((raw) => {
            if (typeof raw !== "string") {
                sentAudio++;
                assert.ok(raw.byteLength <= 16000);
                send({type: "partial", text: "LIVE PREVIEW ONLY"});
                return;
            }
            const message = JSON.parse(raw);
            if (message.type === "start") {
                assert.equal(message.token, "offline-test-token");
                requestId = message.requestId;
                send({type: "ready", maxDurationMs: 60000});
            } else if (message.type === "stop") {
                send({type: "final", text: " STREAMED FINAL न्यायालय"});
                send({type: "final", text: " STREAMED FINAL न्यायालय"});
            } else if (message.type === "cancel") cancelled++;
        });
    });
    await page.goto(`${origin}/spike-editor`);
    const editor = page.locator(".editor-content");
    await editor.waitFor();
    const first = editor.locator("p").first();
    const original = await first.innerText();
    await first.click();
    await page.keyboard.press("End");
    await page.getByRole("button", { name: "Dictate", exact: true }).click();
    await page.waitForFunction(() => document.querySelector(".editor-content").textContent.includes("LIVE PREVIEW ONLY"));
    assert.ok(sentAudio > 0, "AudioWorklet sent PCM to the socket");
    assert.equal(await page.getByLabel("Live transcript preview", {exact: true}).count(), 0);
    assert.equal((await first.innerText()).split("LIVE PREVIEW ONLY").length - 1, 1, "partials replace the same inline text");
    await page.getByRole("tab", {name: "Export", exact: true}).click();
    await page.getByRole("button", {name: "Stop dictation", exact: true}).click();
    await page.waitForFunction(() => document.querySelector(".editor-content").textContent.includes("STREAMED FINAL"));
    assert.equal((await editor.innerText()).split("STREAMED FINAL").length - 1, 1);
    assert.equal((await editor.innerText()).includes("LIVE PREVIEW"), false, "final replaces the interim words");
    await page.getByRole("tab", {name: "Home", exact: true}).click();
    await page.getByRole("button", {name: /Undo/}).click();
    assert.equal(await first.innerText(), original, "one undo removes only the final insertion");
    await first.click();
    await page.getByRole("button", {name: "Dictate", exact: true}).click();
    await page.getByRole("button", {name: "Stop dictation", exact: true}).waitFor();
    await page.waitForFunction(() => document.querySelector(".editor-content").textContent.includes("LIVE PREVIEW ONLY"));
    await page.getByRole("button", {name: "Cancel dictation", exact: true}).click();
    await page.getByRole("button", {name: "Dictate", exact: true}).waitFor();
    assert.equal(await first.innerText(), original, "Cancel removes only the current turn");
    assert.equal(connections, 2);
    assert.ok(cancelled >= 1);
    await page.screenshot({path: "/tmp/vakilsuite-streaming-phone.png"});

    // Same editor with native bridge messages: real cursor placement and revisions.
    const native = await context.newPage();
    await native.addInitScript(() => {
        window.testBridgeMessages = [];
        window.ReactNativeWebView = {postMessage: (raw) => window.testBridgeMessages.push(JSON.parse(raw))};
    });
    await native.goto(`${origin}/spike-editor?embedded=1`);
    const nativeEditor = native.locator(".editor-content");
    await nativeEditor.waitFor();
    await nativeEditor.getByText("यह एक परीक्षण दस्तावेज़ है (This is a test document).", {exact: true}).waitFor();
    let requestId;
    const deliver = async (fields) => native.evaluate((message) => document.dispatchEvent(new MessageEvent("message", {data: JSON.stringify(message)})), {version: 1, requestId, ...fields});
    const begin = async () => {
        await native.getByRole("button", {name: "Dictate", exact: true}).click();
        requestId = await native.evaluate(() => window.testBridgeMessages.filter((m) => m.type === "dictation.start").at(-1).requestId);
        await deliver({type: "dictation.status", status: "recording"});
        await native.getByRole("button", {name: "Stop dictation", exact: true}).waitFor();
    };
    const expectText = async (text) => {
        try {
            await native.waitForFunction((expected) => document.querySelector(".editor-content").textContent === expected, text, {timeout: 5000});
        } catch {
            assert.equal(await nativeEditor.textContent(), text);
        }
    };
    const replaceDocument = async (text) => {
        await nativeEditor.focus();
        await native.waitForTimeout(80);
        await nativeEditor.evaluate(async (element) => {
            const range = document.createRange();
            range.selectNodeContents(element);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            document.dispatchEvent(new Event("selectionchange"));
            await new Promise(requestAnimationFrame);
        });
        await native.keyboard.press("Backspace");
        if (text) await native.keyboard.insertText(text);
        await expectText(text);
    };
    await replaceDocument("LEFT RIGHT");
    await nativeEditor.evaluate(async (element) => {
        const text = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
        window.getSelection().collapse(text, 5);
        document.dispatchEvent(new Event("selectionchange"));
        await new Promise(requestAnimationFrame);
    });
    // Changing language moves focus out of the document before Dictate is tapped.
    await native.getByLabel("Dictation language").selectOption("en-IN");
    await begin();
    await deliver({type: "dictation.partial", transcript: "माननी "});
    await expectText("LEFT माननी RIGHT");
    await deliver({type: "dictation.partial", transcript: "माननीय न्यायालय "});
    await expectText("LEFT माननीय न्यायालय RIGHT");
    for (const width of [320, 768, 1366, 390]) {
        await native.setViewportSize({width, height: 844});
        assert.ok(await native.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `no page overflow at ${width}px`);
        await expectText("LEFT माननीय न्यायालय RIGHT");
    }
    await native.screenshot({path: "/tmp/vakilsuite-inline-dictation-live.png"});
    await native.getByRole("button", {name: "Stop dictation", exact: true}).click();
    await deliver({type: "dictation.result", transcript: "माननीय न्यायालय। "});
    await expectText("LEFT माननीय न्यायालय। RIGHT");
    assert.equal(await native.getByRole("button", {name: "Insert at current cursor", exact: true}).count(), 0);
    await deliver({type: "dictation.result", transcript: "DUPLICATE"});
    assert.equal((await nativeEditor.innerText()).includes("DUPLICATE"), false);
    await native.getByRole("button", {name: /Undo/}).click();
    await expectText("LEFT RIGHT");

    // Empty document and no pre-existing caret must work on a fresh WebView.
    await replaceDocument("");
    await native.getByRole("tab", {name: "Layout", exact: true}).click();
    await begin();
    await deliver({type: "dictation.partial", transcript: "नया दस्तावेज़"});
    await expectText("नया दस्तावेज़");
    await native.getByRole("button", {name: "Cancel dictation", exact: true}).click();
    await expectText("");

    // Transport errors keep visible speech so it can be reviewed or corrected.
    await begin();
    await deliver({type: "dictation.partial", transcript: "सुरक्षित शब्द"});
    await expectText("सुरक्षित शब्द");
    await deliver({type: "dictation.error", message: "Connection interrupted"});
    await native.getByRole("alert").filter({hasText: "Connection interrupted"}).waitFor();
    await expectText("सुरक्षित शब्द");
    await deliver({type: "dictation.partial", transcript: "STALE"});
    await expectText("सुरक्षित शब्द");
    await native.screenshot({path: "/tmp/vakilsuite-inline-dictation-phone.png"});
    // Starting on a fresh page, without first tapping the editor, uses its end.
    await native.reload();
    await nativeEditor.getByText("यह एक परीक्षण दस्तावेज़ है (This is a test document).", {exact: true}).waitFor();
    const freshText = await nativeEditor.textContent();
    await begin();
    await deliver({type: "dictation.partial", transcript: " पहली आवाज़"});
    await expectText(`${freshText} पहली आवाज़`);
    await native.getByRole("button", {name: "Cancel dictation", exact: true}).click();
    await expectText(freshText);
    assert.deepEqual(errors, []);
    console.log("PASS: browser PCM, inline live revisions, cursor preservation after blur, final replacement, one Undo, Cancel, empty editor, native bridge and error recovery");
} finally { await browser.close(); }
