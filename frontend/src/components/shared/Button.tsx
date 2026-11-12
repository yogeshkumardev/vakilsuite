"use client";

import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ButtonVariant =
    | "primary"    // indigo — main CTAs
    | "secondary"  // white + border — secondary actions
    | "danger"     // red — destructive actions
    | "success"    // emerald — push/confirm positive outcomes
    | "ghost";     // no background — toolbar / inline actions

export type ButtonSize = "xs" | "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    loading?: boolean;
    /** Icon or spinner shown before label */
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    children: ReactNode;
    /** Pill shape (rounded-full) instead of rounded-lg */
    pill?: boolean;
    /** Full width */
    fullWidth?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
    primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 border border-transparent focus-visible:ring-indigo-500",
    secondary:
        "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus-visible:ring-slate-400",
    danger:
        "bg-red-600 text-white hover:bg-red-700 border border-transparent focus-visible:ring-red-500",
    success:
        "bg-emerald-600 text-white hover:bg-emerald-700 border border-transparent focus-visible:ring-emerald-500",
    ghost:
        "bg-transparent text-slate-500 border border-transparent hover:bg-slate-50 hover:text-slate-800 focus-visible:ring-slate-300",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
    xs: "px-2.5 py-1    text-[10px] font-medium gap-1",
    sm: "px-3   py-1.5  text-xs     font-medium gap-1.5",
    md: "px-4   py-2    text-sm     font-medium gap-2",
    lg: "px-5   py-2.5  text-sm     font-semibold gap-2",
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = "primary",
            size = "md",
            loading = false,
            leftIcon,
            rightIcon,
            children,
            pill = false,
            fullWidth = false,
            disabled,
            className = "",
            type = "button",
            ...rest
        },
        ref,
    ) => {
        const isDisabled = disabled || loading;

        const base = [
            "inline-flex items-center justify-center",
            "min-h-9 whitespace-nowrap transition-colors duration-150",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
            pill ? "rounded-full" : "rounded-lg",
            fullWidth ? "w-full" : "",
            isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : "",
            VARIANT_CLASSES[variant],
            SIZE_CLASSES[size],
            className,
        ]
            .filter(Boolean)
            .join(" ");

        return (
            <button ref={ref} type={type} disabled={isDisabled} className={base} {...rest}>
                {loading ? (
                    <Spinner size={size} />
                ) : leftIcon ? (
                    <span className="flex-shrink-0 leading-none">{leftIcon}</span>
                ) : null}
                {children}
                {!loading && rightIcon ? (
                    <span className="flex-shrink-0 leading-none">{rightIcon}</span>
                ) : null}
            </button>
        );
    },
);
Button.displayName = "Button";

// ─────────────────────────────────────────────────────────────────────────────
// Spinner — matches button size
// ─────────────────────────────────────────────────────────────────────────────

function Spinner({ size }: { size: ButtonSize }) {
    const dim =
        size === "xs" ? "h-2.5 w-2.5" :
        size === "sm" ? "h-3 w-3"     :
        size === "lg" ? "h-4 w-4"     : "h-3.5 w-3.5";

    return (
        <svg
            className={`${dim} animate-spin flex-shrink-0`}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor"
                strokeWidth="4"
            />
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
            />
        </svg>
    );
}
