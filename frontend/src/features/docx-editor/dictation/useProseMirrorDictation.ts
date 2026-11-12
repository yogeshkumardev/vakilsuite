"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DictationLanguage } from "@/lib/api/dictation";
import { resolveDictationTransport } from "./dictationTransport";
import { startBrowserRealtime, type BrowserRealtimeSession } from "./browserRealtime";

export type DictationState = "idle" | "requesting" | "recording" | "transcribing" | "error";

interface ActiveTurn {
    id: string;
    native: boolean;
    startPos: number;
    currentLength: number;
}

export interface EditorViewLike {
    state: {
        doc: {
            textBetween: (from: number, to: number, blockSeparator?: string, leafText?: string) => string;
        };
        selection: { from: number; to: number };
        tr: {
            insertText: (text: string, from: number, to?: number) => any;
            delete: (from: number, to: number) => any;
            setSelection?: (sel: any) => any;
            doc: any;
        };
    };
    dispatch: (tr: any) => void;
    /**
     * ProseMirror EditorView does NOT expose a simple `.editable` boolean.
     * The real check is `view.props.editable?.(view.state) !== false`.
     * We use `isEditorEditable()` helper instead of this field.
     * @deprecated Do not use — always undefined on a real EditorView.
     */
    editable?: boolean;
    props?: {
        editable?: (state: any) => boolean;
    };
    focus: () => void;
}

declare global {
    interface Window {
        ReactNativeWebView?: { postMessage: (message: string) => void };
    }
}

/**
 * ProseMirror `EditorView` does NOT expose a `.editable` boolean property.
 * The real check is `view.props.editable?.(view.state) !== false`.
 * Falling back to `true` matches PM's default (editable unless explicitly disabled).
 */
function isEditorEditable(view: EditorViewLike | null | undefined): boolean {
    if (!view) return false;
    // Real ProseMirror EditorView: check via props
    if (typeof (view as any).props?.editable === "function") {
        return (view as any).props.editable(view.state) !== false;
    }
    // Explicit boolean field (test mocks, legacy wrappers)
    if (typeof view.editable === "boolean") return view.editable;
    // Default: treat as editable (matches PM's own default)
    return true;
}

function postNative(type: "dictation.stop" | "dictation.cancel", requestId: string) {
    window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, type, requestId }));
}

export function useProseMirrorDictation(getView: () => EditorViewLike | null | undefined) {
    const [state, setState] = useState<DictationState>("idle");
    const [language, setLanguage] = useState<DictationLanguage>("hi-IN");
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const turnRef = useRef<ActiveTurn | null>(null);
    const sessionRef = useRef<BrowserRealtimeSession | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const clearTimers = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        timerRef.current = intervalRef.current = null;
    }, []);

    const release = useCallback(() => {
        const turn = turnRef.current;
        turnRef.current = null;
        clearTimers();
        if (turn?.native) postNative("dictation.cancel", turn.id);
        sessionRef.current?.cancel();
        sessionRef.current = null;
    }, [clearTimers]);

    const fail = useCallback((id: string, message: string) => {
        if (turnRef.current?.id !== id) return;
        release();
        setError(message);
        setState("error");
    }, [release]);

    const recording = useCallback((id: string) => {
        if (turnRef.current?.id !== id) return;
        clearTimers();
        const started = Date.now();
        intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 500);
        setState("recording");
    }, [clearTimers]);

    const finishing = useCallback((id: string) => {
        if (turnRef.current?.id !== id) return;
        clearTimers();
        setState("transcribing");
        timerRef.current = setTimeout(() => fail(id, "Transcription timed out. Please try again."), 22_000);
    }, [clearTimers, fail]);

    const updatePartial = useCallback((id: string, text: string) => {
        const turn = turnRef.current;
        if (!turn || turn.id !== id) return;
        const view = getView();
        if (!view || !isEditorEditable(view)) return;

        try {
            const { state: pmState, dispatch } = view;
            const from = turn.startPos;
            const to = turn.startPos + turn.currentLength;
            const tr = pmState.tr.insertText(text, from, to);
            dispatch(tr);
            turn.currentLength = text.length;
        } catch (err) {
            console.error("[useProseMirrorDictation] Failed to update partial text:", err);
        }
    }, [getView]);

    const insert = useCallback((id: string, text: string) => {
        const turn = turnRef.current;
        if (!turn || turn.id !== id) return;
        const view = getView();

        if (view && isEditorEditable(view)) {
            try {
                const { state: pmState, dispatch } = view;
                const from = turn.startPos;
                const to = turn.startPos + turn.currentLength;

                const prevChar = from > 0 ? pmState.doc.textBetween(from - 1, from, " ", " ") : "";
                const insertText = prevChar && !/\s/.test(prevChar) ? " " + text : text;

                const tr = pmState.tr.insertText(insertText, from, to);
                dispatch(tr);
                view.focus();
            } catch (err) {
                console.error("[useProseMirrorDictation] Failed to commit final text:", err);
            }
        }

        release();
        setError(null);
        setState("idle");
    }, [getView, release]);

    useEffect(() => {
        const receive = (event: MessageEvent) => {
            const turn = turnRef.current;
            if (!turn?.native || !window.ReactNativeWebView) return;
            let raw: unknown = event.data;
            if (typeof raw === "string") {
                if (raw.length > 51_000) return;
                try {
                    raw = JSON.parse(raw);
                } catch {
                    return;
                }
            }
            if (!raw || typeof raw !== "object") return;
            const message = raw as Record<string, unknown>;
            if (message.version !== 1 || message.requestId !== turn.id) return;

            if (message.type === "dictation.partial" || message.type === "dictation.result") {
                if (typeof message.transcript !== "string" || message.transcript.length > 50_000) return;
                if (message.type === "dictation.partial") {
                    updatePartial(turn.id, message.transcript);
                } else {
                    insert(turn.id, message.transcript);
                }
            } else if (message.type === "dictation.error" && typeof message.message === "string") {
                fail(turn.id, message.message.slice(0, 240));
            } else if (message.type === "dictation.status") {
                if (message.status === "recording") recording(turn.id);
                else if (message.status === "transcribing") finishing(turn.id);
                else if (message.status === "idle") {
                    release();
                    setState("idle");
                }
            }
        };

        window.addEventListener("message", receive);
        document.addEventListener("message", receive as EventListener);
        return () => {
            window.removeEventListener("message", receive);
            document.removeEventListener("message", receive as EventListener);
            release();
        };
    }, [fail, finishing, insert, recording, release, updatePartial]);

    const start = () => {
        const view = getView();
        if (!view || !isEditorEditable(view) || turnRef.current) return;

        setError(null);
        setElapsed(0);
        const transport = resolveDictationTransport(
            Boolean(window.ReactNativeWebView),
            new URLSearchParams(window.location.search).get("embedded") === "1",
        );

        if (transport === "bridge-unavailable") {
            setState("error");
            setError("Android editor bridge is unavailable. Close and reopen the editor.");
            return;
        }

        const id = crypto.randomUUID();
        const startPos = view.state.selection.from;
        turnRef.current = { id, native: transport === "native", startPos, currentLength: 0 };

        setState("requesting");
        timerRef.current = setTimeout(() => fail(id, "Dictation did not start. Check microphone permission and the server."), 35_000);

        if (transport === "native") {
            window.ReactNativeWebView!.postMessage(
                JSON.stringify({
                    version: 1,
                    type: "dictation.start",
                    requestId: id,
                    languageCode: language,
                    mode: "codemix",
                }),
            );
        } else {
            sessionRef.current = startBrowserRealtime(language, id, {
                onRecording: () => recording(id),
                onStopping: () => finishing(id),
                onPartial: (text) => updatePartial(id, text),
                onFinal: (text) => insert(id, text),
                onError: (message) => fail(id, message),
            });
        }
    };

    const stop = () => {
        const turn = turnRef.current;
        if (!turn || state !== "recording") return;
        finishing(turn.id);
        if (turn.native) postNative("dictation.stop", turn.id);
        else sessionRef.current?.stop();
    };

    const cancel = () => {
        const turn = turnRef.current;
        const view = getView();
        if (turn && turn.currentLength > 0 && view && isEditorEditable(view)) {
            try {
                const { state: pmState, dispatch } = view;
                const tr = pmState.tr.delete(turn.startPos, turn.startPos + turn.currentLength);
                dispatch(tr);
            } catch (err) {
                console.error("[useProseMirrorDictation] Failed to revert partial text on cancel:", err);
            }
        }
        release();
        setState("idle");
        setError(null);
    };

    return {
        state,
        language,
        setLanguage,
        elapsed,
        error,
        start,
        stop,
        cancel,
    };
}
