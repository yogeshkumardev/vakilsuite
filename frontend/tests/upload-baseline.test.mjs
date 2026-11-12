import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const fixture = JSON.parse(fs.readFileSync(new URL("./fixtures/baseline.json", import.meta.url), "utf8"));
function load(path, imports = {}) {
    const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    vm.runInNewContext(outputText, { exports, require: (name) => { if (!(name in imports)) throw new Error(name); return imports[name]; } });
    return exports;
}
const plain = (value) => JSON.parse(JSON.stringify(value));

test("web consumes metadata-only confirmation and sends an empty body", async () => {
    const calls = [];
    const { documentsApi } = load("../src/lib/api/documents.ts", { "./client": { apiClient: {
        post: async (path, body) => { calls.push({ path, body }); return fixture.confirm_response; },
        get: async () => fixture.view_response,
    } } });
    const data = await documentsApi.confirmUpload(fixture.confirm_response.data.document.id);
    assert.deepEqual(data, fixture.confirm_response.data);
    assert.deepEqual(plain(calls[0].body), fixture.confirm_request);
    assert.deepEqual(await documentsApi.getViewUrl(data.document.id), fixture.view_response.data);
});

function uploadHarness({ failPresign = false, failPut = false, failConfirm = false, alreadyUploaded = false } = {}) {
    const options = { failPresign, failPut, failConfirm, alreadyUploaded };
    const calls = { ids: [], puts: 0, confirms: 0 };
    let current = true;
    const { completeUpload } = load("../src/lib/api/upload-document.ts", { "./documents": {
        documentsApi: {
            presign: async (_case, body) => {
                calls.ids.push(body.client_upload_id);
                if (options.failPresign) throw new Error("presign response lost");
                return { ...fixture.presign_response.data, already_uploaded: options.alreadyUploaded };
            },
            confirmUpload: async () => { calls.confirms++; if (options.failConfirm) throw new Error("confirm response lost"); return fixture.confirm_response.data; },
        },
        uploadFileToR2: async () => { calls.puts++; if (options.failPut) throw new Error("transfer failed"); if (options.switchAccount) current = false; },
    } });
    const attempt = { id: fixture.presign_request.client_upload_id, caseId: fixture.confirm_response.data.document.case_id,
        documentType: "other", file: { name: "synthetic-scan.pdf", size: 1200, type: "application/pdf" } };
    return { calls, options, run: () => completeUpload(attempt, () => current, () => {}) };
}

for (const failure of ["failPresign", "failPut", "failConfirm"]) {
    test(`web ${failure} retry keeps one upload ID and transfer checkpoint`, async () => {
        const h = uploadHarness({ [failure]: true });
        await assert.rejects(h.run());
        h.options[failure] = false;
        assert.equal(await h.run(), fixture.presign_response.data.document_id);
        assert.equal(new Set(h.calls.ids).size, 1);
        if (failure === "failConfirm") { assert.equal(h.calls.puts, 1); assert.equal(h.calls.ids.length, 1); }
    });
}

test("completed upload retry never overwrites the original", async () => {
    const h = uploadHarness({ alreadyUploaded: true });
    await h.run();
    assert.equal(h.calls.puts, 0);
});

test("account change during transfer prevents confirmation", async () => {
    const h = uploadHarness();
    h.options.switchAccount = true;
    await assert.rejects(h.run(), /session or page changed/);
    assert.equal(h.calls.confirms, 0);
});

test("legacy deep links are gated, current document routes are not", () => {
    const { isDeferredPage } = load("../src/lib/feature-availability.ts");
    for (const path of ["/cause-list", "/cases/c/context", "/cases/c/drafts/d", "/cases/c/courtroom/s"]) assert.equal(isDeferredPage(path), true);
    for (const path of ["/dashboard", "/cases/c", "/cases/c/documents/d", "/profile"]) assert.equal(isDeferredPage(path), false);
});
