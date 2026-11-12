import { type ReactNode } from "react";

interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    metadata?: ReactNode;
    actions?: ReactNode;
    compact?: boolean;
    className?: string;
}

export function PageHeader({
    title,
    description,
    metadata,
    actions,
    compact = false,
    className = "",
}: PageHeaderProps) {
    return (
        <header className={`flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between ${compact ? "mb-3" : "mb-6"} ${className}`}>
            <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <h1 className="min-w-0 truncate text-xl font-semibold leading-7 text-slate-950">
                        {title}
                    </h1>
                    {metadata}
                </div>
                {description ? (
                    <div className="mt-1 text-sm leading-5 text-slate-500">{description}</div>
                ) : null}
            </div>
            {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}

interface SectionHeaderProps {
    id?: string;
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
}

export function SectionHeader({ id, title, description, actions, className = "" }: SectionHeaderProps) {
    return (
        <div className={`mb-3 flex items-start justify-between gap-3 ${className}`}>
            <div>
                <h2 id={id} className="text-sm font-semibold leading-5 text-slate-900">{title}</h2>
                {description ? <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p> : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
    );
}
