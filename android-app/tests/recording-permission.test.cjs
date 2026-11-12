const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const tick = () => new Promise((resolve) => setImmediate(resolve));

function setup(permission = {granted: true, canAskAgain: true}) {
  const exports = {}, timers = new Map();
  let sequence = 0, state = "active", current = true, requests = 0, answer;
  vm.runInNewContext(ts.transpileModule(
    fs.readFileSync(path.join(__dirname, "../src/lib/editor/recordingPermission.ts"), "utf8"),
    {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}},
  ).outputText, {
    exports,
    setTimeout: (callback) => { timers.set(++sequence, callback); return sequence; },
    clearTimeout: (id) => timers.delete(id),
  });
  const gate = new exports.RecordingPermissionGate({
    check: async () => permission,
    request: () => { requests++; return new Promise((resolve) => {answer = resolve;}); },
    currentState: () => state,
  });
  return {
    gate, timers, prepare: () => gate.prepare(() => current),
    setState: (next) => {state = next; return gate.onAppState(next);},
    answer: (p = {granted: true, canAskAgain: true}) => answer(p),
    cancel: () => {current = false;}, requests: () => requests,
  };
}

test("already granted permission never requests another OS popup", async () => {
  const s = setup();
  await s.prepare();
  assert.equal(s.requests(), 0);
  assert.equal(s.setState("background"), true, "normal background protection is preserved");
});

test("permission background event is tolerated but startup waits for active", async () => {
  const s = setup({granted: false, canAskAgain: true});
  let prepared = false;
  const pending = s.prepare().then(() => {prepared = true;});
  await tick();
  assert.equal(s.requests(), 1);
  assert.equal(s.setState("background"), false);
  s.answer();
  await tick();
  assert.equal(prepared, false);
  assert.equal(s.timers.size, 1);
  assert.equal(s.setState("active"), false);
  await pending;
  assert.equal(prepared, true);
  assert.equal(s.timers.size, 0);
  assert.equal(s.setState("background"), true);
});

test("active event before permission promise also permits safe startup", async () => {
  const s = setup({granted: false, canAskAgain: true});
  const pending = s.prepare();
  await tick();
  s.setState("background");
  s.setState("active");
  s.answer();
  await pending;
  assert.equal(s.timers.size, 0);
});

test("permission rejection resets exemption and blocked permission is not requested", async () => {
  const s = setup({granted: false, canAskAgain: true});
  const pending = assert.rejects(s.prepare(), /permission is required/);
  await tick();
  s.setState("background");
  s.answer({granted: false, canAskAgain: true});
  await pending;
  assert.equal(s.setState("background"), true);
  const blocked = setup({granted: false, canAskAgain: false});
  await assert.rejects(blocked.prepare(), /blocked/);
  assert.equal(blocked.requests(), 0);
});

test("leaving the app while the permission prompt is open cannot start recording", async () => {
  const s = setup({granted: false, canAskAgain: true});
  const pending = assert.rejects(s.prepare(), /Return to the app/);
  await tick();
  s.setState("background");
  s.answer();
  await tick();
  [...s.timers.values()][0]();
  await pending;
  assert.equal(s.timers.size, 0);
  assert.equal(s.setState("background"), true);
});

test("cancel/account change during prompt prevents late startup", async () => {
  const s = setup({granted: false, canAskAgain: true});
  const pending = assert.rejects(s.prepare(), /cancelled/);
  await tick();
  s.setState("background");
  s.cancel();
  s.answer();
  await pending;
  assert.equal(s.timers.size, 0);
});

test("editor disposal releases foreground wait and timeout", async () => {
  const s = setup({granted: false, canAskAgain: true});
  const pending = assert.rejects(s.prepare(), /cancelled/);
  await tick();
  s.setState("background");
  s.answer();
  await tick();
  s.gate.cancelWait();
  await pending;
  assert.equal(s.timers.size, 0);
});
