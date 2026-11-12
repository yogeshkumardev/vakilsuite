"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { useCreateDraft } from "@/features/drafts/hooks/useDrafts";
import { DraftType, DRAFT_TYPE_LABELS } from "@/lib/api/drafts";

// ── DraftTypeSelector ──────────────────────────────────────────────────────────

const DRAFT_TYPES: DraftType[] = [
    "bail_application",
    "anticipatory_bail",
    "writ_petition",
    "pil",
    "criminal_revision",
    "quashing_petition",
    "affidavit",
    "other",
];

export function DraftTypeSelector({
    caseId,
    disabled,
}: {
    caseId: string;
    disabled: boolean;
}) {
    const router = useRouter();
    const [selectedType, setSelectedType] =
        useState<DraftType>("bail_application");
    const [instructions, setInstructions] = useState("");
    const createDraft = useCreateDraft(caseId);

    const handleGenerate = async () => {
        const res = await createDraft.mutateAsync({
            draft_type: selectedType,
            additional_instructions: instructions || undefined,
        });
        router.push(`/cases/${caseId}/drafts/${res.id}`);
    };

    return (
        <div className='rounded-lg border border-slate-200 bg-white p-5 space-y-4'>
            <h3 className='text-sm font-semibold text-slate-800'>
                Generate Draft
            </h3>

            {disabled && (
                <div className='rounded-lg bg-amber-50 border border-amber-200 px-3 py-2'>
                    <p className='text-xs text-amber-700'>
                        Summary must be current before generating a draft. Push
                        documents and regenerate summary first.
                    </p>
                </div>
            )}

            <div className='grid grid-cols-2 gap-2'>
                {DRAFT_TYPES.map((type) => (
                    <button
                        key={type}
                        type='button'
                        onClick={() => setSelectedType(type)}
                        className={`rounded-lg border px-3 py-2.5 text-sm font-medium text-left transition-colors ${
                            selectedType === type
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-200 text-slate-700 hover:border-indigo-400"
                        }`}
                    >
                        {DRAFT_TYPE_LABELS[type]}
                    </button>
                ))}
            </div>

            <div>
                <label className='block text-xs font-medium text-slate-600 mb-1'>
                    Additional instructions (optional)
                </label>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    placeholder='e.g. Emphasize limitation expiry, mention co-accused released...'
                    className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none resize-none'
                    disabled={disabled}
                />
            </div>

            <button
                type='button'
                onClick={handleGenerate}
                disabled={disabled || createDraft.isPending}
                className='w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors'
            >
                {createDraft.isPending
                    ? "Creating…"
                    : `Generate ${DRAFT_TYPE_LABELS[selectedType]}`}
            </button>
        </div>
    );
}
