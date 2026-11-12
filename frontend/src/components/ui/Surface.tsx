import { type HTMLAttributes, type ReactNode } from "react";

type SurfaceVariant = "plain" | "bordered" | "inset" | "interactive";

const VARIANTS: Record<SurfaceVariant, string> = {
    plain: "bg-white",
    bordered: "rounded-lg border border-slate-200 bg-white shadow-[var(--ui-shadow-surface)]",
    inset: "rounded-lg border border-slate-200 bg-slate-50",
    interactive: "rounded-lg border border-slate-200 bg-white transition-colors hover:border-slate-300 hover:bg-slate-50",
};

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
    variant?: SurfaceVariant;
    children: ReactNode;
    as?: "div" | "section" | "article";
}

export function Surface({ variant = "bordered", children, className = "", as: Component = "div", ...props }: SurfaceProps) {
    return (
        <Component className={`${VARIANTS[variant]} ${className}`} {...props}>
            {children}
        </Component>
    );
}
