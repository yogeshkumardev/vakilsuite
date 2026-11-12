import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../src/features/documents/sources/source-errors.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {typingFailureMessage}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('unknown diagnostics stay out of user messages',()=>{
 const secret='Internal SQL error with private object path';
 assert.ok(!typingFailureMessage(secret).includes(secret));
 assert.match(typingFailureMessage('OCR_OUTCOME_UNKNOWN_NO_RETRY'),/additional charge/);
 assert.match(typingFailureMessage('OCR_SOURCE_OR_POLICY_CHANGED',true),/Start typing again/);
 assert.match(typingFailureMessage('OCR_OUTPUT_TRUNCATED'),/complete text/);
 assert.ok(!typingFailureMessage('OCR_SOURCE_OR_POLICY_CHANGED',false).includes('Start typing again'));
});

const {sourceFailureMessage,retrySourceInspection}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
test('recoverable failures have actionable safe messages and bounded read retries',()=>{
 for(const action of ['load','type','save','review']) {
  assert.ok(!sourceFailureMessage({status:500,message:'private SQL trace'},action).includes('private'));
  assert.match(sourceFailureMessage({status:429},action),/still view/);
 }
 assert.match(sourceFailureMessage({status:409},'save'),/Keep your edits/);
 assert.match(sourceFailureMessage({status:422},'review'),/Every original page/);
 assert.ok(!sourceFailureMessage({status:422},'review').includes('assign all text'));
 assert.equal(retrySourceInspection(0,{status:503}),true);
 assert.equal(retrySourceInspection(2,{status:503}),false);
 for(const status of [401,403,404,409,422,429])assert.equal(retrySourceInspection(0,{status}),false);
});
