import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/features/documents/sources/source-editor-content.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {initialSourceContent,hasText}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const doc=text=>({pageLayout:{size:'A4'},editorState:{root:{type:'root',children:[{type:'paragraph',children:[{type:'text',text}]}]}}});
test('old empty source labels become one blank paragraph without mutating stored source',()=>{
 const original=doc('[Original page 1]'); const before=JSON.stringify(original);
 const blank=JSON.parse(initialSourceContent(original));
 assert.deepEqual(blank.editorState.root.children[0].children,[]);
 assert.deepEqual(blank.pageLayout,original.pageLayout);
 assert.equal(JSON.stringify(original),before); assert.equal(hasText(original),false);
});
test('OCR/manual text and source metadata survive unchanged',()=>{
 const original=doc('हिन्दी statement 123');original.editorState.root.children[0].sourcePage=3;
 assert.equal(initialSourceContent(original),JSON.stringify(original));assert.equal(hasText(original),true);
 assert.equal(initialSourceContent(null),null);
});
