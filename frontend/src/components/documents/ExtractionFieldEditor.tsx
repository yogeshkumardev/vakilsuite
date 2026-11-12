"use client";

import { useState } from "react";
import { ReviewStatus } from "@/lib/api/extraction";
import { CONTROL_CLASS } from "@/components/ui/Field";

interface ExtractionFieldEditorProps {
    extractedFields: Record<string, unknown>;
    reviewStatus: ReviewStatus;
    onSave: (
        fields: Record<string, unknown>,
        status: ReviewStatus,
    ) => Promise<void>;
    saving?: boolean;
}

function FieldValue({ value }: { value: unknown }) {
    if (value === null || value === undefined) {
        return <span className='text-slate-300 italic'>Not found</span>;
    }
    if (Array.isArray(value)) {
        if (value.length === 0)
            return <span className='text-slate-300 italic'>None</span>;
        return (
            <ul className='space-y-0.5'>
                {value.map((v, i) => (
                    <li key={i} className='flex items-center gap-1.5'>
                        <span className='h-1 w-1 rounded-full bg-slate-400 flex-shrink-0' />
                        <span>{String(v)}</span>
                    </li>
                ))}
            </ul>
        );
    }
    return <span>{String(value)}</span>;
}

function formatFieldLabel(key: string): string {
    return key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}

export function ExtractionFieldEditor({
    extractedFields,
    reviewStatus,
    onSave,
    saving = false,
}: ExtractionFieldEditorProps) {
    const [fields, setFields] =
        useState<Record<string, unknown>>(extractedFields);
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    const handleEditStart = (key: string) => {
        const val = fields[key];
        setEditingKey(key);
        setEditValue(
            Array.isArray(val)
                ? val.join("\n")
                : val == null
                  ? ""
                  : String(val),
        );
    };

    const handleEditSave = (key: string) => {
        const original = fields[key];
        let newValue: unknown = editValue;

        // Restore array type if original was array
        if (Array.isArray(original)) {
            newValue = editValue
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean);
        }

        setFields((prev) => ({ ...prev, [key]: newValue }));
        setEditingKey(null);
        setIsDirty(true);
    };

    const handleAccept = () => onSave(fields, "accepted");
    const handleReject = () => onSave(fields, "rejected");
    const handleSaveEdits = () => onSave(fields, "edited");

    const statusColors: Record<ReviewStatus, string> = {
        pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        accepted: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        rejected: "bg-red-50 text-red-600 ring-1 ring-red-200",
        edited: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
    };

    const inputClass = `${CONTROL_CLASS} py-2`;

    return (
        <div className='flex flex-col h-full'>
            {/* Header */}
            <div className='flex items-center justify-between px-4 py-3 border-b border-slate-100'>
                <h3 className='text-sm font-semibold text-slate-800'>
                    Extracted Fields
                </h3>
                <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[reviewStatus]}`}
                >
                    {reviewStatus}
                </span>
            </div>

            {/* Fields */}
            <div className='flex-1 overflow-y-auto px-4 py-3 space-y-3'>
                {Object.entries(fields).map(([key, value]) => (
                    <div
                        key={key}
                        className='rounded-lg border border-slate-100 bg-slate-50 p-3'
                    >
                        <div className='flex items-center justify-between mb-1'>
                            <span className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>
                                {formatFieldLabel(key)}
                            </span>
                            {editingKey !== key && (
                                <button
                                    type='button'
                                    onClick={() => handleEditStart(key)}
                                    className='text-xs text-slate-400 hover:text-slate-700 transition-colors'
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        {editingKey === key ? (
                            <div className='space-y-2'>
                                {Array.isArray(value) ? (
                                    <textarea
                                        value={editValue}
                                        onChange={(e) =>
                                            setEditValue(e.target.value)
                                        }
                                        className={inputClass}
                                        rows={3}
                                        placeholder='One item per line'
                                        autoFocus
                                    />
                                ) : (
                                    <input
                                        value={editValue}
                                        onChange={(e) =>
                                            setEditValue(e.target.value)
                                        }
                                        className={inputClass}
                                        autoFocus
                                    />
                                )}
                                <div className='flex gap-2'>
                                    <button
                                        type='button'
                                        onClick={() => handleEditSave(key)}
                                        className='rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700'
                                    >
                                        Save
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => setEditingKey(null)}
                                        className='text-xs text-slate-400 hover:text-slate-600 px-2'
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className='text-sm text-slate-800'>
                                <FieldValue value={value} />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Action buttons */}
            <div className='border-t border-slate-100 px-4 py-3 space-y-2'>
                {isDirty && (
                    <button
                        type='button'
                        onClick={handleSaveEdits}
                        disabled={saving}
                        className='w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors'
                    >
                        {saving ? "Saving…" : "Save Edits"}
                    </button>
                )}
                <div className='flex gap-2'>
                    <button
                        type='button'
                        onClick={handleAccept}
                        disabled={saving || reviewStatus === "accepted"}
                        className='flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors'
                    >
                        ✓ Accept
                    </button>
                    <button
                        type='button'
                        onClick={handleReject}
                        disabled={saving || reviewStatus === "rejected"}
                        className='flex-1 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors'
                    >
                        ✕ Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
