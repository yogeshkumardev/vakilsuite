"use client";

import dynamic from "next/dynamic";
import React from "react";
import type { DocxEditorProps } from "./DocxEditorComponent";

const DynamicDocxEditor = dynamic(
    () => import("./DocxEditorComponent"),
    {
        ssr: false,
        loading: () => (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 p-6 text-slate-500">
                <div className="flex items-center gap-3">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
                    <p className="text-sm font-medium">Opening Document Editor…</p>
                </div>
                <p className="mt-1 text-xs text-slate-400">Loading fonts and word processing engine</p>
            </div>
        ),
    },
);

export function DocxEditor(props: DocxEditorProps) {
    return <DynamicDocxEditor {...props} />;
}

export type { DocxEditorProps };
export default DocxEditor;
