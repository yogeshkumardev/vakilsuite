import { type HTMLAttributes, type ReactNode } from "react";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "accent";

const TONES: Record<BadgeTone, string> = {
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    info: "border-blue-200 bg-blue-50 text-blue-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-red-200 bg-red-50 text-red-700",
    accent: "border-indigo-200 bg-indigo-50 text-indigo-700",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: BadgeTone;
    children: ReactNode;
}

export function Badge({ tone = "neutral", children, className = "", ...props }: BadgeProps) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4 ${TONES[tone]} ${className}`} {...props}>
            {children}
        </span>
    );
}
