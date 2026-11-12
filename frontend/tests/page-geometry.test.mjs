import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../src/features/editor-core/pageGeometry.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { pageGeometry, measuredPageCount } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const layout = { pageSize: 'A4', orientation: 'portrait', marginTop: 25, marginBottom: 25, marginLeft: 25, marginRight: 25 };
test('paper size, orientation and margins change usable space', () => {
    const a4 = pageGeometry(layout);
    const legal = pageGeometry({ ...layout, pageSize: 'Legal' });
    const letter = pageGeometry({ ...layout, pageSize: 'Letter' });
    assert.ok(legal.contentHeight > a4.contentHeight && a4.contentHeight > letter.contentHeight);
    const landscape = pageGeometry({ ...layout, orientation: 'landscape' });
    assert.equal(landscape.width, a4.height);
    assert.equal(landscape.height, a4.width);
    assert.ok(pageGeometry({ ...layout, marginBottom: 40 }).contentHeight < a4.contentHeight);
});
test('count reflects vertical pages without phantom pages from pixel rounding', () => {
    const { contentHeight, stride } = pageGeometry(layout);
    for (let count = 1; count <= 20; count++) {
        assert.equal(measuredPageCount(Math.round(contentHeight + (count - 1) * stride), contentHeight, stride), count);
    }
    assert.equal(measuredPageCount(0, contentHeight, stride), 1);
});
