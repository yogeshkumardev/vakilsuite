import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const tick = () => new Promise((resolve) => setImmediate(resolve));
for (const platform of ["frontend", "android-app"]) {
    function setup(overrides = {}) {
        const source = fs.readFileSync(new URL(`../../${platform}/src/lib/api/realtime-channel.ts`, import.meta.url), "utf8");
        const exports = {};
        const sockets = [], timers = new Map(), calls = { ready: [], partial: [], final: [], error: [], tokens: [] };
        let timerId = 0, current = true;
        class Socket {
            static OPEN = 1;
            readyState = 1;
            sent = [];
            // Deliberately absent: bufferedAmount (React Native).
            constructor() { sockets.push(this); }
            send(data) { if (this.broken) throw new Error("closed"); this.sent.push(data); }
            close() { this.readyState = 3; }
            message(value) { this.onmessage?.({ data: JSON.stringify({ version: 1, requestId: "turn", ...value }) }); }
        }
        vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
            exports, WebSocket: Socket,
            setTimeout: (fn, ms) => { timers.set(++timerId, { fn, ms }); return timerId; },
            clearTimeout: (id) => timers.delete(id),
        });
        const channel = exports.createRealtimeChannel({
            url: "ws://localhost:8000/api/v1/dictation/realtime", requestId: "turn", languageCode: "hi-IN", mode: "codemix",
            isCurrent: () => current,
            getToken: async (refresh) => { calls.tokens.push(refresh); return "test-token"; },
            onReady: (v) => calls.ready.push(v), onPartial: (v) => calls.partial.push(v),
            onFinal: (v) => calls.final.push(v), onError: (v) => calls.error.push(v), ...overrides,
        });
        return { channel, sockets, timers, calls, changeAccount: () => { current = false; } };
    }
    test(`${platform}: bounded PCM, partial preview, exactly one final, no token in URL`, async () => {
        const s = setup();
        await tick();
        const ws = s.sockets[0];
        ws.onopen();
        assert.equal(JSON.parse(ws.sent[0]).token, "test-token");
        ws.message({ type: "ready", maxDurationMs: 60000 });
        s.channel.sendAudio(new ArrayBuffer(32002));
        assert.deepEqual(ws.sent.slice(1).map((b) => b.byteLength), [16000, 16000, 2]);
        ws.message({ type: "partial", text: "माननीय" });
        assert.deepEqual(s.calls.partial, ["माननीय"]);
        assert.deepEqual(s.calls.final, []);
        s.channel.stop();
        const lateHandler = ws.onmessage;
        ws.message({ type: "final", text: "माननीय न्यायालय" });
        lateHandler({ data: JSON.stringify({ version: 1, requestId: "turn", type: "final", text: "duplicate" }) });
        assert.deepEqual(s.calls.final, ["माननीय न्यायालय"]);
        assert.equal(s.timers.size, 0);
        assert.equal(ws.readyState, 3);
    });
    test(`${platform}: one auth refresh before capture, never replays sent audio`, async () => {
        const s = setup();
        await tick();
        s.sockets[0].message({ type: "error", code: "AUTH_INVALID" });
        await tick();
        assert.deepEqual(s.calls.tokens, [false, true]);
        s.sockets[1].message({ type: "ready", maxDurationMs: 60000 });
        s.channel.sendAudio(new ArrayBuffer(2));
        s.sockets[1].message({ type: "error", code: "AUTH_INVALID" });
        await tick();
        assert.equal(s.sockets.length, 2);
        assert.equal(s.calls.error.length, 1);
        assert.equal(s.timers.size, 0);
    });
    test(`${platform}: cancel pending auth creates no socket`, async () => {
        let resolve;
        const s = setup({ getToken: () => new Promise((r) => { resolve = r; }) });
        s.channel.cancel();
        resolve("token");
        await tick();
        assert.equal(s.sockets.length, 0);
        assert.equal(s.timers.size, 0);
    });
    test(`${platform}: account change and wrong turn ignore results`, async () => {
        const s = setup(); await tick();
        const ws = s.sockets[0];
        ws.message({ requestId: "old", type: "ready", maxDurationMs: 60000 });
        assert.equal(s.calls.ready.length, 0);
        s.changeAccount();
        ws.message({ type: "partial", text: "private" });
        assert.equal(s.calls.partial.length, 0);
        assert.equal(ws.readyState, 3);
    });
    test(`${platform}: stop send races and backpressure fail with cleanup`, async () => {
        for (const broken of [true, false]) {
            const s = setup(); await tick();
            const ws = s.sockets[0];
            ws.message({ type: "ready", maxDurationMs: 60000 });
            ws.broken = broken;
            if (broken) s.channel.stop();
            else { ws.bufferedAmount = 300000; s.channel.sendAudio(new ArrayBuffer(2)); }
            assert.equal(s.calls.error.length, 1);
            assert.equal(ws.readyState, 3);
            assert.equal(s.timers.size, 0);
        }
    });
    test(`${platform}: finalization timeout is bounded and cancellation ignores late final`, async () => {
        const s = setup(); await tick();
        const ws = s.sockets[0];
        ws.message({ type: "ready", maxDurationMs: 60000 });
        s.channel.stop();
        const handler = ws.onmessage;
        [...s.timers.values()][0].fn();
        handler({ data: JSON.stringify({ version: 1, requestId: "turn", type: "final", text: "late" }) });
        assert.equal(s.calls.error.length, 1);
        assert.equal(s.calls.final.length, 0);
        assert.equal(s.timers.size, 0);
    });
}

test("browser worklet resamples bounded chunks and flushes only once", () => {
    const source = fs.readFileSync(new URL("../public/dictation-pcm-worklet.js", import.meta.url), "utf8");
    for (const sampleRate of [16000, 44100, 48000]) {
        let Processor;
        const messages = [];
        vm.runInNewContext(source, {
            AudioWorkletProcessor: class { port = { postMessage: (message) => messages.push(message) }; },
            registerProcessor: (_, value) => { Processor = value; }, sampleRate,
        });
        const processor = new Processor();
        for (let i = 0; i < sampleRate; i += 128) {
            processor.process([[new Float32Array(Math.min(128, sampleRate - i)).fill(0.5)]]);
        }
        processor.port.onmessage({ data: { type: "flush" } });
        const audio = messages.filter((m) => m.type === "audio");
        assert.equal(audio.reduce((sum, m) => sum + m.bytes.byteLength, 0), 32000, `sample count at ${sampleRate}`);
        assert.ok(audio.every((m) => m.bytes.byteLength <= 3200));
        const count = messages.length;
        processor.process([[new Float32Array(128)]]);
        assert.equal(messages.length, count);
        assert.equal(messages.at(-1).type, "flushed");
    }
});
