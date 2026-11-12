import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';

const source=await readFile(new URL('../src/features/summaries/summary-errors.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {summaryFailureMessage,summaryFailureMayHaveQueuedWork,summaryRunFailureMessage}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('policy rejections do not falsely imply a queued paid summary',()=>{
    assert.match(summaryFailureMessage({status:403,message:'private policy'}),/not enabled/);
    assert.equal(summaryFailureMayHaveQueuedWork({status:403}),false);
    assert.match(summaryFailureMessage({status:409}),/changed/);
    assert.equal(summaryFailureMayHaveQueuedWork({status:409}),false);
    assert.match(summaryFailureMessage({status:422}),/processing limits/);
    assert.equal(summaryFailureMayHaveQueuedWork({status:422}),false);
});

test('failed provider run explains the next action without leaking internal codes',()=>{
    assert.match(summaryRunFailureMessage('INVALID_INPUT'),/start a new attempt/);
    assert.ok(!summaryRunFailureMessage('INVALID_INPUT').includes('INVALID_INPUT'));
});
