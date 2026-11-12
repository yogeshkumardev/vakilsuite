/** Version 1 of the bounded PCM dictation socket. No credentials in the URL. */
export interface RealtimeCallbacks {
    onReady: (maxDurationMs: number) => void;
    onPartial: (text: string) => void;
    onFinal: (text: string) => void;
    onError: (message: string) => void;
}
export interface RealtimeChannel {
    sendAudio: (bytes: ArrayBuffer) => void;
    stop: () => void;
    cancel: () => void;
}
export function createRealtimeChannel(options: RealtimeCallbacks & {
    url: string;
    requestId: string;
    languageCode: string;
    mode: string;
    getToken: (refresh: boolean) => Promise<string | null>;
    isCurrent: () => boolean;
    createSocket?: (url: string) => WebSocket;
}): RealtimeChannel {
    let socket: WebSocket | null = null;
    let phase: "connecting" | "recording" | "finishing" | "closed" = "connecting";
    let refreshed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined; };
    const closeSocket = () => {
        const old = socket;
        socket = null;
        if (old) {
            old.onopen = old.onmessage = old.onclose = old.onerror = null;
            try { old.close(); } catch { /* Native socket may already be disposed. */ }
        }
    };
    const cancel = () => {
        if (phase === "closed") return;
        phase = "closed";
        clearTimer();
        try {
            if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "cancel" }));
        } catch { /* Closing the socket below is sufficient to cancel upstream. */ }
        closeSocket();
    };
    const fail = (message: string) => {
        if (phase === "closed") return;
        const current = options.isCurrent();
        cancel();
        if (current) options.onError(message);
    };
    const armTimeout = (ms: number, message: string) => {
        clearTimer();
        timer = setTimeout(() => fail(message), ms);
    };
    const connect = async (refresh = false) => {
        const sequence = ++attempt;
        armTimeout(20_000, "Live dictation could not connect. Check the server and try again.");
        try {
            const token = await options.getToken(refresh);
            if (phase === "closed" || sequence !== attempt) return;
            if (!options.isCurrent()) { cancel(); return; }
            if (!token) { fail("Please sign in again to use dictation."); return; }
            const ws = options.createSocket ? options.createSocket(options.url) : new WebSocket(options.url);
            socket = ws;
            ws.binaryType = "arraybuffer";
            const active = () => {
                if (socket !== ws || phase === "closed") return false;
                if (!options.isCurrent()) { cancel(); return false; }
                return true;
            };
            ws.onopen = () => {
                if (!active()) return;
                try { ws.send(JSON.stringify({
                    version: 1, type: "start", requestId: options.requestId,
                    token, languageCode: options.languageCode, mode: options.mode,
                })); } catch { fail("Dictation connection was interrupted."); }
            };
            ws.onmessage = (event) => {
                if (!active() || typeof event.data !== "string" || event.data.length > 51_000) return;
                let value: Record<string, unknown>;
                try {
                    const parsed: unknown = JSON.parse(event.data);
                    if (!parsed || typeof parsed !== "object") throw new Error();
                    value = parsed as Record<string, unknown>;
                } catch { fail("Invalid response from the dictation server."); return; }
                if (value.version !== 1 || value.requestId !== options.requestId) return;
                if (value.type === "error") {
                    if (value.code === "AUTH_INVALID" && phase === "connecting" && !refreshed) {
                        refreshed = true;
                        closeSocket();
                        void connect(true);
                    } else {
                        fail(typeof value.message === "string" ? value.message.slice(0, 240) : "Live dictation failed.");
                    }
                } else if (value.type === "ready" && phase === "connecting") {
                    const max = value.maxDurationMs;
                    if (typeof max !== "number" || !Number.isFinite(max) || max < 1000 || max > 120_000) {
                        fail("Invalid recording limit from the server."); return;
                    }
                    clearTimer();
                    phase = "recording";
                    options.onReady(max);
                } else if (value.type === "partial" && (phase === "recording" || phase === "finishing")) {
                    if (typeof value.text === "string" && value.text.length <= 50_000) options.onPartial(value.text);
                } else if (value.type === "final" && phase === "finishing") {
                    if (typeof value.text !== "string" || !value.text.trim() || value.text.length > 50_000) {
                        fail("No speech was detected. Please try again."); return;
                    }
                    phase = "closed";
                    clearTimer();
                    closeSocket();
                    options.onFinal(value.text);
                }
            };
            ws.onerror = () => { if (active()) fail("Cannot reach the live dictation server. Check your connection."); };
            ws.onclose = () => { if (active()) fail("Dictation connection was interrupted. Start again when connected."); };
        } catch {
            fail("Unable to start dictation. Check your connection and sign-in.");
        }
    };
    void connect();
    return {
        sendAudio: (bytes) => {
            if (phase !== "recording" || !options.isCurrent()) return;
            if (!socket || socket.readyState !== WebSocket.OPEN) { fail("Dictation connection was interrupted."); return; }
            // RN may not expose bufferedAmount; capture is still bounded by the turn limit.
            if ((socket.bufferedAmount ?? 0) > 256_000) {
                fail("Connection is too slow for live dictation. Please try again."); return;
            }
            try {
                for (let offset = 0; offset < bytes.byteLength; offset += 16_000) {
                    socket.send(bytes.slice(offset, offset + 16_000));
                }
            } catch { fail("Audio could not be sent. Please try again."); }
        },
        stop: () => {
            if (phase !== "recording") return;
            if (!socket || socket.readyState !== WebSocket.OPEN) { fail("Dictation connection was interrupted."); return; }
            phase = "finishing";
            armTimeout(20_000, "Transcription timed out. Please start another dictation.");
            try { socket.send(JSON.stringify({ type: "stop" })); }
            catch { fail("Dictation connection was interrupted."); }
        },
        cancel,
    };
}

