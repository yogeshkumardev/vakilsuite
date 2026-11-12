const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function load(env = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/lib/editor/bridge.ts"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, process: { env }, URL });
  return exports;
}

test("editor URL is local by default and contains no credentials", () => {
  const bridge = load();
  assert.equal(bridge.getEditorSpikeUrl(), "http://127.0.0.1:3000/spike-editor?embedded=1");
  assert.throws(() => bridge.getEditorSpikeUrl("http://user:pass@127.0.0.1:3000"), /credentials/);
  assert.throws(() => bridge.getEditorSpikeUrl("http://example.com"), /HTTPS/);
});

test("WebView navigation stays on the configured editor origin", () => {
  const bridge = load();
  assert.equal(bridge.isAllowedEditorNavigation("about:blank"), true);
  assert.equal(bridge.isAllowedEditorNavigation("http://127.0.0.1:3000/spike-editor?embedded=1"), true);
  assert.equal(bridge.isAllowedEditorNavigation("http://127.0.0.1:3000/another-path"), true);
  assert.equal(bridge.isAllowedEditorNavigation("https://example.com/phishing"), false);
});

test("native bridge accepts metadata messages and rejects content-shaped input", () => {
  const bridge = load();
  assert.deepEqual(
    JSON.parse(JSON.stringify(bridge.parseEditorBridgeMessage('{"version":1,"type":"dirty","dirty":true}'))),
    { version: 1, type: "dirty", dirty: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(bridge.parseEditorBridgeMessage('{"version":1,"type":"saved","characterCount":42,"savedAt":"2026-10-01T00:00:00.000Z"}'))),
    { version: 1, type: "saved", characterCount: 42, savedAt: "2026-10-01T00:00:00.000Z" },
  );
  assert.equal(bridge.parseEditorBridgeMessage('{"version":1,"type":"saved","content":"secret"}'), null);
  assert.equal(bridge.parseEditorBridgeMessage("not-json"), null);
});

test("native bridge accepts only the supported dictation commands", () => {
  const bridge = load();
  assert.deepEqual(
    JSON.parse(JSON.stringify(bridge.parseEditorBridgeMessage('{"version":1,"type":"dictation.start","requestId":"turn","languageCode":"hi-IN","mode":"codemix"}'))),
    { version: 1, type: "dictation.start", requestId: "turn", languageCode: "hi-IN", mode: "codemix" },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(bridge.parseEditorBridgeMessage('{"version":1,"type":"dictation.stop","requestId":"turn"}'))),
    { version: 1, type: "dictation.stop", requestId: "turn" },
  );
  assert.equal(
    bridge.parseEditorBridgeMessage('{"version":1,"type":"dictation.start","requestId":"turn","languageCode":"xx","mode":"codemix"}'),
    null,
  );
  assert.equal(
    bridge.parseEditorBridgeMessage('{"version":1,"type":"dictation.result","transcript":"must not come from web"}'),
    null,
  );
});

test("native-to-editor dictation payloads are length bounded", () => {
  const bridge = load();
  const transcript = "a".repeat(50_010);
  const result = JSON.parse(bridge.serializeNativeEditorMessage({
    version: 1,
    type: "dictation.result",
    requestId: "turn",
    transcript,
  }));
  assert.equal(result.transcript.length, 50_000);
});

test("dictation requires a bounded turn identifier", () => {
  const bridge = load();
  for (const requestId of [undefined, "", "x".repeat(65)]) {
    assert.equal(bridge.parseEditorBridgeMessage(JSON.stringify({version: 1, type: "dictation.stop", requestId})), null);
  }
});
