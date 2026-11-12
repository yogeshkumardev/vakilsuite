"use client";

import React from "react";
import { Mic, Square, X } from "lucide-react";
import type { DictationLanguage } from "@/lib/api/dictation";
import { useProseMirrorDictation, type EditorViewLike } from "./useProseMirrorDictation";

interface DictationControlProps {
    getView: () => EditorViewLike | null | undefined;
    readOnly?: boolean;
}

export function DictationControl({ getView, readOnly = false }: DictationControlProps) {
    const {
        state,
        language,
        setLanguage,
        elapsed,
        error,
        start,
        stop,
        cancel,
    } = useProseMirrorDictation(getView);

    if (readOnly) return null;

    const busy = state === "requesting" || state === "transcribing";
    const active = busy || state === "recording";

    return (
        <div className="dictation-control flex items-center gap-1.5 px-2 py-1 text-xs" data-state={state}>
            <select
                aria-label="Dictation language"
                className="h-7 rounded border border-slate-300 bg-white px-2 text-xs text-slate-800 shadow-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={language}
                onChange={(e) => setLanguage(e.target.value as DictationLanguage)}
                disabled={active}
            >
                <option value="hi-IN">Hindi + English</option>
                <option value="en-IN">English</option>
                <option value="unknown">Auto detect</option>
            </select>

            {state === "recording" ? (
                <button
                    type="button"
                    onClick={stop}
                    className="flex h-7 items-center gap-1 rounded bg-red-600 px-2.5 font-semibold text-white shadow-xs hover:bg-red-700"
                    aria-label="Stop dictation"
                >
                    <Square size={13} />
                    <span>Stop {elapsed}s</span>
                </button>
            ) : (
                <button
                    type="button"
                    onClick={start}
                    disabled={busy}
                    aria-busy={busy}
                    className="flex h-7 items-center gap-1 rounded bg-indigo-600 px-2.5 font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60"
                >
                    <Mic size={14} />
                    <span>{busy ? (state === "transcribing" ? "Finishing…" : "Starting…") : "Dictate"}</span>
                </button>
            )}

            {active && (
                <button
                    type="button"
                    onClick={cancel}
                    className="flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                    aria-label="Cancel dictation"
                    title="Cancel dictation"
                >
                    <X size={14} />
                </button>
            )}

            <span className="sr-only" role="status">
                {state === "recording"
                    ? "Listening. Text appears at your document cursor."
                    : state === "transcribing"
                    ? "Finishing transcription"
                    : state}
            </span>

            {error && (
                <p role="alert" className="max-w-[200px] truncate text-xs font-medium text-red-600" title={error}>
                    {error}
                </p>
            )}
        </div>
    );
}
