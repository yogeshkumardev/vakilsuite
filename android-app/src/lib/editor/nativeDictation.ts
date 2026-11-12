import type { RealtimeCallbacks, RealtimeChannel } from "@/lib/api/realtime-channel";
import type { EditorBridgeMessage, NativeEditorMessage } from "./bridge";
import { Pcm16Converter } from "./pcm16";

export type DictationPhase = "idle" | "requesting" | "recording" | "transcribing";
type Start = Extract<EditorBridgeMessage, { type: "dictation.start" }>;
type Turn = { id: string; phase: DictationPhase; channel: RealtimeChannel | null; converter: Pcm16Converter; account: number };
interface Dependencies {
  prepareAudio: (isCurrent: () => boolean) => Promise<void>;
  startAudio: () => Promise<void>;
  stopAudio: () => void;
  resetAudio: () => Promise<void>;
  connect: (input: RealtimeCallbacks & { requestId: string; languageCode: string; mode: string; isCurrent: () => boolean }) => RealtimeChannel;
  accountGeneration: () => number;
  post: (message: NativeEditorMessage) => void;
  onPhase: (phase: DictationPhase) => void;
}

/** Native session ownership lives outside the route, so late events cannot touch a new editor/turn. */
export class NativeDictationController {
  private turn: Turn | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private audioOperations: Promise<unknown> = Promise.resolve();

  constructor(private readonly dependencies: Dependencies) {}

  private current(turn: Turn) {
    return this.turn === turn && this.dependencies.accountGeneration() === turn.account;
  }

  private clearTimer() { if (this.timer) clearTimeout(this.timer); this.timer = undefined; }

  private enqueueAudio(operation: () => Promise<void>) {
    this.audioOperations = this.audioOperations.catch(() => undefined).then(operation);
    return this.audioOperations;
  }

  private cleanup(turn: Turn) {
    if (this.turn !== turn) return;
    this.turn = null;
    this.clearTimer();
    turn.channel?.cancel();
    this.dependencies.stopAudio();
    void this.enqueueAudio(this.dependencies.resetAudio).catch(() => undefined);
    this.dependencies.onPhase("idle");
  }

  private fail(turn: Turn, message: string) {
    if (this.turn !== turn) return;
    this.cleanup(turn);
    this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.error", message });
  }

  start(input: Start) {
    if (this.turn) return;
    const turn: Turn = { id: input.requestId, phase: "requesting", channel: null, converter: new Pcm16Converter(), account: this.dependencies.accountGeneration() };
    this.turn = turn;
    this.dependencies.onPhase("requesting");
    this.timer = setTimeout(() => this.fail(turn, "Microphone permission or connection timed out. Please try again."), 30_000);
    void this.enqueueAudio(async () => {
      if (this.current(turn)) await this.dependencies.prepareAudio(() => this.current(turn));
    }).then(() => {
      if (!this.current(turn)) return;
      turn.channel = this.dependencies.connect({
        requestId: turn.id, languageCode: input.languageCode, mode: input.mode,
        isCurrent: () => this.current(turn),
        onReady: (maxDurationMs) => {
          void this.enqueueAudio(async () => {
            if (!this.current(turn)) return;
            await this.dependencies.startAudio();
            if (!this.current(turn)) { this.dependencies.stopAudio(); return; }
            this.clearTimer();
            turn.phase = "recording";
            this.dependencies.onPhase("recording");
            this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.status", status: "recording" });
            this.timer = setTimeout(() => this.stop(turn.id), Math.max(1000, maxDurationMs - 300));
          }).catch(() => this.fail(turn, "The microphone stream could not start."));
        },
        onPartial: (text) => { if (this.current(turn)) this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.partial", transcript: text }); },
        onFinal: (text) => {
          if (!this.current(turn) || turn.phase !== "transcribing") return;
          this.cleanup(turn);
          this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.result", transcript: text });
        },
        onError: (message) => this.fail(turn, message),
      });
    }).catch((cause) => this.fail(turn, cause instanceof Error ? cause.message : "Microphone could not start."));
  }

  audio(buffer: { data: ArrayBuffer; sampleRate: number; channels: number }) {
    const turn = this.turn;
    if (!turn || !this.current(turn) || turn.phase !== "recording") return;
    try {
      const bytes = turn.converter.convert(buffer.data, buffer.sampleRate, buffer.channels);
      if (bytes.byteLength) turn.channel?.sendAudio(bytes);
    } catch { this.fail(turn, "Microphone audio could not be streamed. Please try again."); }
  }

  stop(requestId: string) {
    const turn = this.turn;
    if (!turn || turn.id !== requestId || turn.phase !== "recording") return;
    turn.phase = "transcribing";
    this.clearTimer();
    this.dependencies.stopAudio();
    void this.enqueueAudio(this.dependencies.resetAudio).catch(() => undefined);
    this.dependencies.onPhase("transcribing");
    this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.status", status: "transcribing" });
    turn.channel?.stop();
  }

  cancel(requestId?: string, reason?: string) {
    const turn = this.turn;
    if (!turn || (requestId && requestId !== turn.id)) return;
    if (reason) this.fail(turn, reason);
    else {
      this.cleanup(turn);
      this.dependencies.post({ version: 1, requestId: turn.id, type: "dictation.status", status: "idle" });
    }
  }

  dispose() {
    if (this.turn) this.cleanup(this.turn);
  }
}
