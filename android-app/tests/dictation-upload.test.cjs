const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load({ exists = true, size = 1024 } = {}) {
  const requests = [];
  class MockFile {
    constructor(uri) {
      this.uri = uri;
      this.exists = exists;
      this.size = size;
    }
  }
  class MockFormData {
    entries = [];
    append(...args) { this.entries.push(args); }
  }
  const source = fs.readFileSync(path.join(__dirname, "../src/lib/api/dictation.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports,
    FormData: MockFormData,
    require: (name) => {
      if (name === "expo-file-system") return { File: MockFile };
      if (name === "@/lib/api/client") return { apiClient: {
        postForm: async (url, form) => { requests.push({ url, form }); return { transcript: "test" }; },
      } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return { transcribeNativeDictation: exports.transcribeNativeDictation, requests, MockFile };
}

const input = {
  uri: "file:///cache/recording.m4a",
  languageCode: "hi-IN",
  mode: "codemix",
  clientRequestId: "12e15160-d19a-4c9e-a73e-8ef8ab5a2b01",
};

test("native dictation sends a real File with the authenticated multipart client", async () => {
  const { transcribeNativeDictation, requests, MockFile } = load();
  await transcribeNativeDictation(input);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/dictation/transcriptions");
  assert.ok(requests[0].form.entries[0][1] instanceof MockFile);
  assert.deepEqual(requests[0].form.entries[0].slice(0, 1), ["audio"]);
  assert.equal(requests[0].form.entries[0][2], "dictation.m4a");
});

test("native dictation does not upload an empty recording", async () => {
  const { transcribeNativeDictation, requests } = load({ size: 0 });
  await assert.rejects(transcribeNativeDictation(input), /recording could not be saved/i);
  assert.equal(requests.length, 0);
});
