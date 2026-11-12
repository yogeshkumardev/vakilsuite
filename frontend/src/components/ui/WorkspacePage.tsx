import { type HTMLAttributes, type ReactNode } from "react";

export type WorkspacePageVariant = "standard" | "form" | "wide" | "immersive";

const VARIANT_CLASSES: Record<WorkspacePageVariant, string> = {
    standard: "mx-auto min-h-full w-full max-w-[var(--ui-page-standard)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
    form: "mx-auto min-h-full w-full max-w-[var(--ui-page-standard)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
    wide: "mx-auto min-h-full w-full max-w-[var(--ui-page-wide)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
    immersive: "h-full min-h-0 w-full px-2 py-2 sm:px-3",
};

interface WorkspacePageProps extends HTMLAttributes<HTMLDivElement> {
    variant?: WorkspacePageVariant;
    children: ReactNode;
}

export function WorkspacePage({
    variant = "standard",
    children,
    className = "",
    ...props
}: WorkspacePageProps) {
    return (
        <div className={`${VARIANT_CLASSES[variant]} ${className}`} {...props}>
            {children}
        </div>
    );
}
