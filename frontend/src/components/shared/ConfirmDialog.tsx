"use client";

import { useEffect, useRef } from "react";
import { Button } from "./Button";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: "danger" | "default";
    loading?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    variant = "default",
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    const cancelRef = useRef<HTMLButtonElement>(null);

    // Focus cancel button when dialog opens
    useEffect(() => {
        if (open) {
            cancelRef.current?.focus();
        }
    }, [open]);

    // Close on Escape
    useEffect(() => {
        if (!open) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onCancel();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onCancel]);

    if (!open) return null;

    const confirmVariant = variant === "danger" ? "danger" : "primary";

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
            {/* Backdrop */}
            <div
                className='absolute inset-0 bg-black/30 backdrop-blur-sm'
                onClick={onCancel}
                aria-hidden='true'
            />

            {/* Dialog */}
            <div
                role='alertdialog'
                aria-modal='true'
                aria-labelledby='dialog-title'
                aria-describedby={
                    description ? "dialog-description" : undefined
                }
                className='relative w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-xl'
            >
                <h2
                    id='dialog-title'
                    className='text-base font-semibold text-slate-900'
                >
                    {title}
                </h2>

                {description && (
                    <p
                        id='dialog-description'
                        className='mt-2 text-sm text-slate-500 leading-relaxed'
                    >
                        {description}
                    </p>
                )}

                <div className='mt-5 flex items-center justify-end gap-2'>
                    <Button
                        ref={cancelRef}
                        variant='secondary'
                        size='md'
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={confirmVariant}
                        size='md'
                        onClick={onConfirm}
                        loading={loading}
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
