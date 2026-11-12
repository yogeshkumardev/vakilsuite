// Synthetic editor content only; blocks all API/provider requests.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const node = (type, children, extra = {}) => ({ type, version: 1, format: '', indent: 0, direction: null, children, ...extra });
const paragraph = text => node('paragraph', [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }]);
const fixture = { schemaVersion: 1, pageLayout: { pageSize: 'A4', orientation: 'portrait', marginTop: 25, marginRight: 25, marginBottom: 25, marginLeft: 25 }, editorState: { root: node('root', [
    node('source-page', [paragraph('Original source reference stays separate.'),
        paragraph('यह लंबा अनुच्छेद है। This paragraph must flow across paper boundaries without changing the saved text. '.repeat(100)),
        ...Array.from({ length: 45 }, (_, n) => paragraph(`Statement ${n + 1}: न्यायालय में प्रस्तुत दस्तावेज़। The advocate reviews this statement and the evidence.`)),
        node('table', Array.from({ length: 30 }, (_, n) => node('tablerow', [
            node('tablecell', [paragraph(`Witness ${n + 1}`)], { headerState: 0, colSpan: 1, rowSpan: 1 }),
            node('tablecell', [paragraph('Evidence supplied for review')], { headerState: 0, colSpan: 1, rowSpan: 1 }),
        ]))),
        { type: 'page-break', version: 1 }, paragraph('After the manual page break.'),
    ], { pageNumber: 1 }),
]) } };
try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => {
        const url = new URL(route.request().url());
        return url.origin !== origin || url.pathname.startsWith('/api/') ? route.abort() : route.continue();
    });
    await page.goto(`${origin}/spike-editor`);
    await page.locator('.editor-content').waitFor();
    await page.evaluate(value => sessionStorage.setItem('vakilsuite_spike_editor_v1', JSON.stringify(value)), fixture);
    await page.getByRole('button', { name: 'Reload saved' }).click();
    await page.waitForFunction(() => document.querySelectorAll('.editor-paper-sheet').length > 2);
    const sheets = await page.locator('.editor-paper-sheet').evaluateAll(elements => elements.slice(0, 3).map(el => {
        const r = el.getBoundingClientRect(); return { left: r.left, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }));
    assert.ok(sheets[0].height > sheets[0].width, 'Portrait sheet must be taller than wide');
    for (let index = 1; index < sheets.length; index++) {
        assert.ok(Math.abs(sheets[index].left - sheets[0].left) < 1, 'Pages must share a vertical axis');
        assert.ok(sheets[index].top > sheets[index - 1].bottom, 'Next page must appear below the previous page');
    }
    assert.equal(await page.locator('.editor-paged-scroll').evaluate(el => el.scrollWidth <= el.clientWidth), true, 'Desktop must not require horizontal page navigation');
    const count = () => page.locator('.editor-paper-sheet').count();
    const a4 = await count();
    await page.getByLabel('Editor page', { exact: true }).selectOption(String(a4));
    await page.waitForTimeout(100);
    assert.equal(await page.getByLabel('Editor page', { exact: true }).inputValue(), String(a4));
    assert.equal(await page.getByRole('button', { name: 'Next editor page', exact: true }).isDisabled(), true);
    await page.getByLabel('Editor page', { exact: true }).selectOption('1');
    const initialText = await page.locator('.editor-content').textContent();
    const sourceStyle = await page.locator('.source-page-region').first().evaluate(el => ({
        before: getComputedStyle(el, '::before').content,
        border: getComputedStyle(el).borderTopWidth,
    }));
    assert.equal(sourceStyle.before, 'none');
    assert.equal(sourceStyle.border, '0px');
    assert.equal(await page.locator('.editor-margin-guide').count(), 0);
    const geometryErrors = await page.locator('.editor-content').evaluate(root => {
        const bounds = root.getBoundingClientRect();
        const css = getComputedStyle(root);
        const width = parseFloat(css.width), height = parseFloat(css.columnHeight);
        const stride = height + parseFloat(css.rowGap);
        const errors = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            if (!walker.currentNode.textContent.trim() || walker.currentNode.parentElement?.closest('[contenteditable="false"]')) continue;
            // Browser ranges include hanging wrap whitespace beyond the line
            // box. Measure visible words, not that non-painted whitespace.
            for (const word of walker.currentNode.textContent.matchAll(/\S+/gu)) {
            const range = document.createRange(); range.setStart(walker.currentNode, word.index); range.setEnd(walker.currentNode, word.index + word[0].length);
            for (const rect of range.getClientRects()) {
                if (!rect.width || !rect.height) continue;
                const row = Math.floor((rect.top - bounds.top + 1) / stride);
                const localX = rect.left - bounds.left;
                const localY = rect.top - bounds.top - row * stride;
                if (localX < -2 || localX + rect.width > width + 2 || localY < -2 || localY + rect.height > height + 2) errors.push({ localX, lineWidth: rect.width, width, top: localY, bottom: localY + rect.height, height });
            }
            }
        }
        for (const row of root.querySelectorAll('tr')) if (row.getClientRects().length !== 1) errors.push('Short table row split across pages');
        return errors;
    });
    assert.deepEqual(geometryErrors.slice(0, 5), []);
    await page.getByRole('button', { name: 'Next editor page', exact: true }).click();
    assert.equal(await page.getByLabel('Editor page', { exact: true }).inputValue(), '2');
    await page.getByRole('tab', { name: 'Layout', exact: true }).click();
    await page.getByRole('button', { name: 'Landscape', exact: true }).click();
    await page.waitForFunction(() => {
        const sheets = [...document.querySelectorAll('.editor-paper-sheet')];
        const a = sheets[0].getBoundingClientRect(), b = sheets[1].getBoundingClientRect();
        return a.width > a.height && b.top > a.bottom && Math.abs(a.left - b.left) < 1;
    });
    await page.getByRole('button', { name: 'Portrait', exact: true }).click();
    await page.waitForFunction(() => {
        const r = document.querySelector('.editor-paper-sheet').getBoundingClientRect(); return r.height > r.width;
    });
    await page.getByLabel('Paper size', { exact: true }).selectOption('Legal');
    await page.waitForFunction(previous => document.querySelectorAll('.editor-paper-sheet').length < previous, a4);
    const legal = await count();
    await page.getByLabel('Paper size', { exact: true }).selectOption('Letter');
    await page.waitForFunction(previous => document.querySelectorAll('.editor-paper-sheet').length > previous, legal);
    assert.equal(await page.locator('.editor-content').textContent(), initialText);
    const pageWidth = await page.locator('.editor-paper-sheet').first().evaluate(el => el.getBoundingClientRect().width);
    for (const width of [1366, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.ok(Math.abs(await page.locator('.editor-paper-sheet').first().evaluate(el => el.getBoundingClientRect().width) - pageWidth) < 1);
        await page.getByLabel('Page zoom', { exact: true }).selectOption('fit');
        await page.waitForTimeout(100);
        await page.getByLabel('Editor page', { exact: true }).selectOption('1');
        await page.screenshot({ path: `/tmp/vakilsuite-pagination-vertical-${width}.png` });
        await page.getByLabel('Page zoom', { exact: true }).selectOption('100');
    }
    // Editing, autosave and reload keep source provenance and the same text tree.
    await page.locator('.editor-content').focus();
    await page.keyboard.press('Control+End');
    await page.keyboard.insertText(' Saved edit.');
    await page.waitForFunction(() => sessionStorage.getItem('vakilsuite_spike_editor_v1')?.includes('Saved edit.'));
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('vakilsuite_spike_editor_v1')));
    assert.equal(saved.editorState.root.children[0].pageNumber, 1);
    assert.equal(saved.pageLayout.pageSize, 'Letter');
    assert.ok(!JSON.stringify(saved).includes('editor-paper-sheet'));
    await page.getByRole('button', { name: 'Reload saved' }).click();
    await page.getByText(/After the manual page break. Saved edit./).waitFor();
    // Intercept only the iframe print call: never open a real printer dialog.
    await page.evaluate(() => {
        const append = Node.prototype.appendChild;
        Node.prototype.appendChild = function(child) {
            const result = append.call(this, child);
            if (child instanceof HTMLIFrameElement && child.title === 'Document print preview') {
                child.contentWindow.print = () => { if (window.__failPrintTest) throw new Error('Synthetic unavailable printer'); window.__printTest = {
                    text: child.contentDocument.body.textContent,
                    css: child.contentDocument.querySelector('style').textContent,
                    hasToolbar: Boolean(child.contentDocument.querySelector('.editor-toolbar-ribbon')),
                    hasGuides: Boolean(child.contentDocument.querySelector('.editor-paper-sheets,.editor-margin-guide')),
                }; };
            }
            return result;
        };
    });
    await page.getByRole('button', { name: 'Print document', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.__printTest));
    const printed = await page.evaluate(() => window.__printTest);
    assert.ok(printed.text.includes('Saved edit.'));
    assert.ok(!printed.text.includes('Original page 1'));
    assert.equal(printed.hasToolbar, false);
    assert.equal(printed.hasGuides, false);
    assert.match(printed.css, /size:216mm 279mm/);
    assert.match(printed.css, /margin:25mm 25mm 25mm 25mm/);
    await page.evaluate(() => document.querySelector('iframe[title="Document print preview"]').contentWindow.dispatchEvent(new Event('afterprint')));
    assert.equal(await page.locator('iframe[title="Document print preview"]').count(), 0);
    await page.evaluate(() => { window.__failPrintTest = true; });
    await page.getByRole('button', { name: 'Print document', exact: true }).click();
    await page.getByRole('alert').getByText('Print preview could not be prepared. Please try again.').waitFor();
    assert.equal(await page.locator('iframe[title="Document print preview"]').count(), 0);
    await page.evaluate(() => { window.__failPrintTest = false; window.__printTest = null; });
    await page.getByRole('button', { name: 'Print document', exact: true }).click();
    await page.waitForFunction(() => Boolean(window.__printTest));
    assert.equal(await page.getByText('Print preview could not be prepared. Please try again.').count(), 0);
    assert.deepEqual(errors, []);
    console.log('PASS: vertical portrait AND landscape pages, A4/Legal/Letter flow, navigation, desktop/tablet/phone, zoom, edit/save/reload, original page provenance');
} finally { await browser.close(); }
