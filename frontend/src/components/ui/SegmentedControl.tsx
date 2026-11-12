import { type LucideIcon } from "lucide-react";

export interface SegmentedControlOption<T extends string> {
    value: T;
    label: string;
    icon?: LucideIcon;
    disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
    value: T;
    options: ReadonlyArray<SegmentedControlOption<T>>;
    onChange: (value: T) => void;
    label: string;
    compact?: boolean;
    className?: string;
}

export function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
    label,
    compact = false,
    className = "",
}: SegmentedControlProps<T>) {
    return (
        <div
            role="group"
            aria-label={label}
            className={`flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 ${className}`}
        >
            {options.map((option) => {
                const Icon = option.icon;
                const active = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        disabled={option.disabled}
                        onClick={() => onChange(option.value)}
                        className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 ${compact ? "h-7 text-[11px]" : "h-8 text-xs"} ${
                            active
                                ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                                : "text-slate-500 hover:bg-white hover:text-slate-800"
                        }`}
                    >
                        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
