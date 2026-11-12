import type { DictationLanguage } from "@/lib/api/dictation";
import { connectBrowserDictation } from "@/lib/api/dictation-realtime";
import type { RealtimeChannel } from "@/lib/api/realtime-channel";
import { useAuthStore } from "@/store/auth.store";

export interface BrowserRealtimeSession {
    stop: () => void;
    cancel: () => void;
}

export interface BrowserRealtimeCallbacks {
    onRecording: () => void;
    onStopping: () => void;
    onPartial: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
}

/** Returns a cancellation handle immediately, including while permission is pending. */
export function startBrowserRealtime(
    language: DictationLanguage,
    requestId: string,
    callbacks: BrowserRealtimeCallbacks,
): BrowserRealtimeSession {
    let done = false;
    let stopping = false;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let node: AudioWorkletNode | null = null;
    let channel: RealtimeChannel | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let unsubscribe = () => {};
    const generation = useAuthStore.getState().generation;
    const current = () => !done && useAuthStore.getState().generation === generation;
    const clearTimer = () => {
        if (timer) clearTimeout(timer);
        timer = undefined;
    };
    const releaseMicrophone = () => {
        source?.disconnect();
        stream?.getTracks().forEach((track) => {
            track.onended = null;
            track.stop();
        });
    };
    const cleanup = () => {
        if (done) return;
        done = true;
        clearTimer();
        unsubscribe();
        document.removeEventListener("visibilitychange", visibilityChanged);
        releaseMicrophone();
        node?.disconnect();
        if (context && context.state !== "closed") void context.close().catch(() => undefined);
        channel?.cancel();
    };
    const fail = (message: string) => {
        if (done) return;
        cleanup();
        callbacks.onError(message);
    };
    const stop = () => {
        if (!current() || stopping || !node || !channel) return;
        stopping = true;
        clearTimer();
        releaseMicrophone();
        callbacks.onStopping();
        timer = setTimeout(() => fail("Microphone did not finish. Please try again."), 3000);
        node.port.postMessage({ type: "flush" });
    };
    function visibilityChanged() {
        if (document.hidden) {
            fail("Dictation stopped when the editor went into the background. Tap Dictate to start again.");
        }
    }

    const initialize = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode || !window.AudioContext) {
                throw new Error("Live dictation requires a browser with microphone and AudioWorklet support.");
            }
            context = new AudioContext({ sampleRate: 16000 });
            const resumed = context.resume();
            void resumed.catch(() => fail("Audio capture could not start. Please try again."));
            unsubscribe = useAuthStore.subscribe((state) => {
                if (state.generation !== generation) fail("Account changed. Please start dictation again.");
            });
            document.addEventListener("visibilitychange", visibilityChanged);
            timer = setTimeout(() => fail("Microphone permission is still pending. Allow access and try again."), 30_000);
            const captured = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
            if (!current()) {
                captured.getTracks().forEach((track) => track.stop());
                return;
            }
            stream = captured;
            stream.getTracks().forEach((track) => {
                track.onended = () => fail("Microphone was disconnected. Please try again.");
            });
            await resumed;
            await context.audioWorklet.addModule("/dictation-pcm-worklet.js");
            if (!current()) return;
            if (context.sampleRate < 16000) throw new Error("This browser cannot capture the required audio format.");
            source = context.createMediaStreamSource(stream);
            node = new AudioWorkletNode(context, "dictation-pcm");
            node.port.onmessage = (event: MessageEvent) => {
                if (!current()) return;
                if (event.data?.type === "audio" && event.data.bytes instanceof ArrayBuffer) {
                    channel?.sendAudio(event.data.bytes);
                } else if (event.data?.type === "flushed" && stopping) {
                    clearTimer();
                    node?.disconnect();
                    if (context && context.state !== "closed") void context.close().catch(() => undefined);
                    channel?.stop();
                }
            };
            clearTimer();
            channel = connectBrowserDictation({
                languageCode: language,
                requestId,
                isCurrent: current,
                onReady: (maxDurationMs) => {
                    if (!current() || !source || !node || !context) return;
                    source.connect(node);
                    node.connect(context.destination);
                    callbacks.onRecording();
                    timer = setTimeout(stop, Math.max(1000, maxDurationMs - 300));
                },
                onPartial: (text) => {
                    if (current()) callbacks.onPartial(text);
                },
                onFinal: (text) => {
                    if (current()) {
                        cleanup();
                        callbacks.onFinal(text);
                    }
                },
                onError: fail,
            });
        } catch (cause) {
            fail(
                cause instanceof DOMException && cause.name === "NotAllowedError"
                    ? "Microphone permission was denied. Allow it in browser settings."
                    : cause instanceof Error
                    ? cause.message
                    : "The microphone could not be started.",
            );
        }
    };
    void initialize();
    return { stop, cancel: cleanup };
}
