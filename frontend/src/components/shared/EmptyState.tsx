import Link from "next/link";
import { CircleSlash2, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
    title: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    icon?: LucideIcon;
}

export function EmptyState({
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    icon: Icon = CircleSlash2,
}: EmptyStateProps) {
    return (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center'>
            <div className='mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100'>
                <Icon className='h-5 w-5 text-slate-400' aria-hidden='true' />
            </div>
            <p className='text-sm font-medium text-slate-700'>{title}</p>
            {description && (
                <p className='mt-1 text-sm text-slate-400 max-w-xs'>
                    {description}
                </p>
            )}
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className='mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2'
                >
                    {actionLabel}
                </Link>
            )}
            {actionLabel && onAction && (
                <Button className='mt-4' onClick={onAction}>
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
