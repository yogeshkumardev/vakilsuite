interface LoadingSpinnerProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

const SIZE_MAP = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
};

export function LoadingSpinner({
    size = "md",
    className = "",
}: LoadingSpinnerProps) {
    return (
        <div
            className={`animate-spin rounded-full border-slate-200 border-t-slate-600 ${SIZE_MAP[size]} ${className}`}
            role='status'
            aria-label='Loading'
        />
    );
}

// Full-page loading state
export function PageLoader() {
    return (
        <div className='flex h-full min-h-48 items-center justify-center'>
            <LoadingSpinner size='lg' />
        </div>
    );
}
