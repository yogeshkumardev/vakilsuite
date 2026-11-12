const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const fixture = require("./fixtures/baseline.json");

test("Android shares the web presign/confirm/original contract without processing fields", async () => {
    const calls = [];
    const client = {
        post: async (url, body) => { calls.push({ url, body }); return (url.endsWith("/presign") ? fixture.presign_response : fixture.confirm_response).data; },
        get: async (url) => url.endsWith("/view-url") ? fixture.view_response.data : { documents: [fixture.confirm_response.data.document] },
    };
    const source = fs.readFileSync(path.join(__dirname, "../src/lib/api/documents.ts"), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    vm.runInNewContext(outputText, { exports, require: () => ({ apiClient: client }) });
    const document = fixture.confirm_response.data.document;
    await exports.presignDocument(document.case_id, fixture.presign_request);
    const confirmed = await exports.confirmUpload(document.id);
    assert.deepEqual(calls[0].body, fixture.presign_request);
    assert.deepEqual(JSON.parse(JSON.stringify(calls[1].body)), {});
    assert.deepEqual(confirmed, fixture.confirm_response.data);
    assert.deepEqual((await exports.listDocuments(document.case_id)).documents, [document]);
    assert.deepEqual(await exports.getDocumentViewUrl(document.id), fixture.view_response.data);
    assert.equal("processing_run" in confirmed, false);
});
