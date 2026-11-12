// Synthetic content only. All API/provider requests are blocked.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:3000';
assert.match(origin, /^http:\/\/(localhost|127\.0\.0\.1):\d+$/);
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH });
const node = (type, children, extra = {}) => ({ type, version: 1, format: '', indent: 0, direction: null, children, ...extra });
const paragraph = text => node('paragraph', [{ type: 'text', version: 1, text, detail: 0, format: 0, mode: 'normal', style: '' }], { textFormat: 0, textStyle: '' });
const fixture = { schemaVersion: 1, pageLayout: { pageSize: 'A4', orientation: 'portrait', marginTop: 25, marginRight: 25, marginBottom: 25, marginLeft: 25 }, editorState: { root: node('root', [
    node('source-page', [paragraph('Header stays left\n\nन्यायालय शीर्षक\nSelected subtitle\nBody stays left'),
        node('table', [node('tablerow', [node('tablecell', [paragraph('Cell first\nCell second')], { headerState: 0, colSpan: 1, rowSpan: 1 }),
            node('tablecell', [paragraph('Other cell')], { headerState: 0, colSpan: 1, rowSpan: 1 })])]),
    ], { pageNumber: 1 }),
    node('source-page', [paragraph('Next source page remains unchanged')], { pageNumber: 2 }),
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
    await page.getByText('Body stays left', { exact: false }).waitFor();
    async function selectText(start, end = start, backwards = false) {
        await page.locator('.editor-content').focus();
        await page.waitForTimeout(80);
        await page.locator('.editor-content').evaluate((root, { start, end, backwards }) => {
            const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
            let first, last, a, b;
            while (walker.nextNode()) {
                const node = walker.currentNode;
                if (!first && node.textContent.includes(start)) { first = node; a = node.textContent.indexOf(start); }
                if (node.textContent.includes(end)) { last = node; b = node.textContent.indexOf(end) + end.length; }
            }
            if (!first || !last) throw new Error('Synthetic selection text missing');
            const selection = window.getSelection();
            if (backwards) selection.setBaseAndExtent(last, b, first, a);
            else selection.setBaseAndExtent(first, a, last, b);
            document.dispatchEvent(new Event('selectionchange'));
        }, { start, end, backwards });
        await page.waitForTimeout(80);
    }
    const formats = () => page.locator('.source-page-region').first().locator(':scope > p').evaluateAll(nodes => nodes.map(p => ({ text: p.textContent, align: p.style.textAlign })));
    await selectText('न्यायालय शीर्षक', 'Selected subtitle');
    assert.equal(await page.evaluate(() => window.getSelection().toString()), 'न्यायालय शीर्षक\nSelected subtitle');
    await page.getByRole('button', { name: 'Align Center', exact: true }).click();
    assert.deepEqual(await formats(), [
        { text: 'Header stays left', align: '' }, { text: '', align: '' },
        { text: 'न्यायालय शीर्षक', align: 'center' }, { text: 'Selected subtitle', align: 'center' }, { text: 'Body stays left', align: '' },
    ]);
    assert.equal(await page.getByRole('button', { name: 'Align Center', exact: true }).getAttribute('aria-pressed'), 'true');
    await page.getByRole('button', { name: /Undo/ }).click();
    assert.equal((await formats()).length, 1);
    await page.getByRole('button', { name: /Redo/ }).click();
    assert.equal((await formats())[2].align, 'center');
    await page.getByRole('button', { name: 'Align Right', exact: true }).focus();
    await page.keyboard.press('Enter');
    assert.equal((await formats())[2].align, 'right');
    assert.equal((await formats())[4].align, '');
    await page.getByRole('button', { name: 'Align Center', exact: true }).click();
    await selectText('Cell second', 'Cell second', true);
    await page.getByRole('button', { name: 'Align Right', exact: true }).click();
    assert.deepEqual(await page.locator('td').first().locator('p').evaluateAll(nodes => nodes.map(p => p.style.textAlign)), ['', 'right']);
    assert.equal(await page.locator('td').nth(1).textContent(), 'Other cell');
    await selectText('Body stays left');
    await page.getByTitle('Line Spacing', { exact: true }).selectOption('2');
    assert.equal(await page.locator('.editor-content p').filter({ hasText: 'Body stays left' }).evaluate(el => el.style.lineHeight), '2');
    await page.waitForFunction(() => sessionStorage.getItem('vakilsuite_spike_editor_v1')?.includes('"format":"right"'));
    const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('vakilsuite_spike_editor_v1')));
    assert.equal(saved.editorState.root.children[0].pageNumber, 1);
    assert.deepEqual(saved.editorState.root.children[1], fixture.editorState.root.children[1]);
    await page.getByRole('button', { name: 'Reload saved' }).click();
    assert.equal((await formats())[2].align, 'center');
    await selectText('Body stays left');
    await page.getByRole('button', { name: 'Bullet List', exact: true }).click();
    assert.equal(await page.locator('.source-page-region').first().locator('li').textContent(), 'Body stays left');
    await page.getByRole('button', { name: 'Bullet List', exact: true }).click();
    await selectText('न्यायालय शीर्षक');
    await page.getByTitle('Paragraph Style', { exact: true }).selectOption('h2');
    assert.equal(await page.locator('.source-page-region').first().locator('h2').textContent(), 'न्यायालय शीर्षक');
    assert.equal(await page.getByTitle('Paragraph Style', { exact: true }).inputValue(), 'h2');
    for (const width of [1366, 768, 390]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const name of ['Bold (Ctrl+B)', 'Align Center', 'Bullet List', 'Increase Indent']) {
            assert.equal(await page.getByRole('button', { name, exact: true }).isVisible(), true, `${name} visible at ${width}`);
        }
        assert.equal(await page.getByTitle('Font Family', { exact: true }).isVisible(), true);
        assert.equal(await page.getByTitle('Line Spacing', { exact: true }).isVisible(), true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.equal(await page.locator('.editor-home-panel').evaluate(el => el.scrollWidth <= el.clientWidth), true);
        await page.screenshot({ path: `/tmp/vakilsuite-formatting-${width}.png` });
    }
    assert.deepEqual(errors, []);
    console.log('PASS: selected OCR lines, undo/redo, table cell, backwards selection, line spacing, save/reload, visible Home ribbon at desktop/tablet/phone');
} finally { await browser.close(); }
