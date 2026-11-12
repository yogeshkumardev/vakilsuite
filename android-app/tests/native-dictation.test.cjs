const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
function load(file, imports = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, "../src/lib/editor", file), "utf8");
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText,
    {exports, require: (id) => imports[id], ArrayBuffer, DataView, ...globals});
  return exports;
}
const { Pcm16Converter } = load("pcm16.ts");
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("PCM converter preserves one second over arbitrary hardware buffer boundaries", () => {
  for (const rate of [8000, 16000, 44100, 48000]) {
    for (const channels of [1, 2]) {
      const converter = new Pcm16Converter();
      const samples = [];
      for (let offset = 0; offset < rate; offset += 127) {
        const input = new Int16Array(Math.min(127, rate - offset) * channels).fill(1200);
        samples.push(...new Int16Array(converter.convert(input.buffer, rate, channels)));
      }
      assert.equal(samples.length, 16000);
      assert.ok(samples.every((v) => v === 1200));
    }
  }
  assert.throws(() => new Pcm16Converter().convert(new ArrayBuffer(1), 16000, 1));
});

function setup(options = {}) {
  const timers = new Map(), events = [], channels = [], phases = [];
  let id = 0, generation = 1, stopped = 0, started = 0, reset = 0;
  const { NativeDictationController } = load("nativeDictation.ts", {"./pcm16": {Pcm16Converter}}, {
    setTimeout: (fn) => {timers.set(++id, fn); return id;}, clearTimeout: (id) => timers.delete(id),
  });
  const controller = new NativeDictationController({
    prepareAudio: async () => {}, startAudio: async () => {started++;}, stopAudio: () => {stopped++;},
    resetAudio: async () => {reset++;}, accountGeneration: () => generation,
    post: (event) => events.push(event), onPhase: (p) => phases.push(p),
    connect: (callbacks) => {
      const channel = {callbacks, audio: [], stopped: 0, cancelled: 0,
        sendAudio(bytes) {this.audio.push(bytes);}, stop() {this.stopped++;}, cancel() {this.cancelled++;}};
      channels.push(channel); return channel;
    }, ...options,
  });
  const start = (requestId = "turn") => controller.start({version: 1, type: "dictation.start", requestId, languageCode: "hi-IN", mode: "codemix"});
  return {controller, start, timers, events, channels, phases, accountChange: () => generation++,
    counts: () => ({started, stopped, reset})};
}
test("native mic starts only after ready; stop finalizes once and frees capture", async () => {
  const s = setup(); s.start(); await tick();
  assert.equal(s.counts().started, 0);
  const channel = s.channels[0];
  channel.callbacks.onReady(60000); await tick();
  s.controller.audio({data: new Int16Array(480).buffer, sampleRate: 48000, channels: 1});
  assert.equal(channel.audio[0].byteLength, 320);
  channel.callbacks.onPartial("माननीय");
  assert.equal(s.events.filter((e) => e.type === "dictation.result").length, 0);
  s.controller.stop("other");
  assert.equal(channel.stopped, 0);
  s.controller.stop("turn");
  channel.callbacks.onFinal("माननीय न्यायालय");
  channel.callbacks.onFinal("duplicate"); await tick();
  assert.equal(s.events.filter((e) => e.type === "dictation.result").length, 1);
  assert.equal(channel.cancelled, 1);
  assert.equal(s.timers.size, 0);
});
test("cancel during pending permission cannot start capture or leak into next turn", async () => {
  let allow;
  const s = setup({prepareAudio: () => new Promise((resolve) => {allow = resolve;})});
  s.start(); await tick();
  s.controller.cancel("turn");
  allow(); await tick();
  assert.equal(s.channels.length, 0);
  assert.equal(s.counts().started, 0);
  assert.equal(s.timers.size, 0);
});
test("cancel during native start stops late microphone and ignores final", async () => {
  let allow;
  const s = setup({startAudio: () => new Promise((resolve) => {allow = resolve;})});
  s.start(); await tick();
  const channel = s.channels[0];
  channel.callbacks.onReady(60000); await tick();
  s.controller.cancel(); allow(); await tick();
  channel.callbacks.onFinal("late");
  assert.equal(s.events.filter((e) => e.type === "dictation.result").length, 0);
  assert.ok(s.counts().stopped >= 2);
});
test("account change and background cancel clear pending transcript", async () => {
  const s = setup(); s.start(); await tick();
  const c = s.channels[0]; c.callbacks.onReady(60000); await tick();
  s.accountChange();
  c.callbacks.onPartial("old private text");
  assert.equal(s.events.filter((e) => e.type === "dictation.partial").length, 0);
  s.controller.cancel(undefined, "Account changed.");
  c.callbacks.onFinal("old final");
  assert.equal(s.events.at(-1).type, "dictation.error");
  assert.equal(s.timers.size, 0);
});
test("native error while preparing releases microphone and permits another turn", async () => {
  const s = setup({prepareAudio: async () => {throw new Error("Permission denied");}});
  s.start(); await tick();
  assert.equal(s.events.at(-1).type, "dictation.error");
  assert.equal(s.timers.size, 0);
  s.start("next"); await tick();
  assert.equal(s.events.at(-1).requestId, "next");
});
