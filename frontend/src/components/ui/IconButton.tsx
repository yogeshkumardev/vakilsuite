import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";

type IconButtonTone = "neutral" | "primary" | "danger";
type IconButtonSize = "sm" | "md";

const TONES: Record<IconButtonTone, string> = {
    neutral: "text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-400",
    primary: "text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 focus-visible:ring-indigo-500",
    danger: "text-slate-400 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500",
};

const SIZES: Record<IconButtonSize, string> = {
    sm: "h-8 w-8",
    md: "h-9 w-9",
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    icon: ReactNode;
    tone?: IconButtonTone;
    size?: IconButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
    { label, icon, tone = "neutral", size = "md", className = "", type = "button", ...props },
    ref,
) {
    return (
        <button
            ref={ref}
            type={type}
            aria-label={label}
            title={label}
            className={`inline-flex shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 ${TONES[tone]} ${SIZES[size]} ${className}`}
            {...props}
        >
            {icon}
        </button>
    );
});
